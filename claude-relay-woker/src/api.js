/**
 * Claude Token 管理器的 API 代理处理
 */

import { API_CONFIG, ERROR_CODES } from './config.js';
import { 
  createErrorResponse, 
  isTokenExpired, 
  logError,
  createCookieHeaders,
  isAuthenticationFailed,
  checkRateLimit
} from './utils.js';
import { 
  getAvailableCookieAccount,
  markAccountRateLimited,
  markAccountInvalid
} from './cookie.js';

/**
 * 处理 Claude API 代理请求 - 支持OAuth和Cookie双模式
 * @param {Request} request - HTTP 请求
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 来自 Claude API 的代理响应
 */
export async function handleMessages(request, env) {
  const url = new URL(request.url);

  // 验证请求方法和路径
  if (request.method !== 'POST' || url.pathname !== '/v1/messages') {
    return createErrorResponse(ERROR_CODES.API_ONLY_POST_MESSAGES, null, 404, getCorsHeaders());
  }

  try {
    // 获取请求体
    const requestBody = await request.json();

    // 智能认证模式选择：优先尝试OAuth，失败时降级到Cookie
    let response = await tryOAuthMode(env, requestBody);
    
    if (!response || response.status >= 400) {
      console.log('OAuth模式失败，尝试Cookie模式');
      response = await tryCookieMode(env, requestBody);
    }

    if (!response) {
      return createErrorResponse(
        ERROR_CODES.AUTH_NO_TOKEN_CONFIGURED, 
        '没有可用的认证方式，请配置OAuth令牌或Cookie账户', 
        401, 
        getCorsHeaders()
      );
    }

    return response;

  } catch (error) {
    logError('API代理错误', error);
    return createErrorResponse(ERROR_CODES.API_PROXY_ERROR, `API代理请求失败: ${error.message}`, 502, getCorsHeaders());
  }
}

/**
 * 尝试OAuth认证模式
 * @param {Object} env - 环境变量
 * @param {Object} requestBody - 请求体
 * @returns {Promise<Response|null>} 响应或null
 */
async function tryOAuthMode(env, requestBody) {
  try {
    // 从 KV 获取存储的令牌
    const tokenData = await env.CLAUDE_KV.get('claude_token');
    if (!tokenData) {
      return null;
    }

    const token = JSON.parse(tokenData);

    // 检查令牌是否过期
    if (isTokenExpired(token)) {
      console.log('OAuth令牌已过期');
      return null;
    }

    console.log('尝试OAuth模式请求');

    // 转发请求到 Claude API
    const claudeResponse = await fetch(API_CONFIG.CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'anthropic-version': API_CONFIG.ANTHROPIC_VERSION,
        'anthropic-beta': API_CONFIG.ANTHROPIC_BETA
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await claudeResponse.text();

    const response = new Response(responseText, {
      status: claudeResponse.status,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders()
      }
    });

    if (claudeResponse.ok) {
      console.log('OAuth模式请求成功');
    } else {
      console.log(`OAuth模式请求失败: ${claudeResponse.status}`);
    }

    return response;

  } catch (error) {
    logError('OAuth模式错误', error);
    return null;
  }
}

/**
 * 尝试Cookie认证模式
 * @param {Object} env - 环境变量
 * @param {Object} requestBody - 请求体
 * @returns {Promise<Response|null>} 响应或null
 */
async function tryCookieMode(env, requestBody) {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 获取可用的Cookie账户
      const account = await getAvailableCookieAccount(env);
      if (!account) {
        console.log('没有可用的Cookie账户');
        return createErrorResponse(
          ERROR_CODES.COOKIE_NO_AVAILABLE_ACCOUNTS, 
          '没有可用的Cookie账户', 
          503, 
          getCorsHeaders()
        );
      }

      console.log(`尝试Cookie模式请求 (尝试 ${attempt}/${maxRetries}), 账户: ${account.name || account.id.substring(0, 8)}`);

      // 转换请求格式为Claude.ai网页API格式
      const webRequestBody = transformToWebRequest(requestBody);

      // 发送请求到Claude.ai网页API
      const claudeResponse = await fetch(API_CONFIG.CLAUDE_WEB_URL, {
        method: 'POST',
        headers: createCookieHeaders(account.cookie),
        body: JSON.stringify(webRequestBody)
      });

      // 检查限流
      const rateLimitCheck = await checkRateLimit(claudeResponse);
      if (rateLimitCheck.isRateLimited) {
        console.log(`账户 ${account.name} 被限流`);
        await markAccountRateLimited(env, account.id, rateLimitCheck.resetTime);
        continue; // 尝试下一个账户
      }

      // 检查认证失败
      if (await isAuthenticationFailed(claudeResponse)) {
        console.log(`账户 ${account.name} 认证失败`);
        await markAccountInvalid(env, account.id);
        continue; // 尝试下一个账户
      }

      if (claudeResponse.ok) {
        console.log(`Cookie模式请求成功, 账户: ${account.name || account.id.substring(0, 8)}`);
        
        // 转换响应格式为标准API格式
        const responseText = await claudeResponse.text();
        const transformedResponse = await transformWebResponse(responseText, requestBody);

        return new Response(transformedResponse, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders()
          }
        });
      } else {
        const errorText = await claudeResponse.text();
        lastError = `HTTP ${claudeResponse.status}: ${errorText}`;
        console.log(`Cookie请求失败: ${lastError}`);
      }

    } catch (error) {
      lastError = error.message;
      logError(`Cookie模式请求错误 (尝试 ${attempt})`, error);
    }
  }

  // 所有重试都失败了
  return createErrorResponse(
    ERROR_CODES.COOKIE_REQUEST_FAILED, 
    `Cookie模式请求失败: ${lastError}`, 
    502, 
    getCorsHeaders()
  );
}

/**
 * 将标准API请求格式转换为Claude.ai网页API格式
 * @param {Object} requestBody - 标准API请求体
 * @returns {Object} 网页API请求体
 */
function transformToWebRequest(requestBody) {
  // 这里需要根据Claude.ai的实际网页API格式进行转换
  // 这是一个简化的转换，实际情况可能需要更复杂的逻辑
  return {
    prompt: extractPromptFromMessages(requestBody.messages || []),
    model: requestBody.model || 'claude-3-sonnet',
    max_tokens: requestBody.max_tokens || 1024,
    stream: requestBody.stream || false,
    // 其他参数根据需要添加
  };
}

/**
 * 从消息数组中提取prompt
 * @param {Array} messages - 消息数组
 * @returns {string} 提取的prompt
 */
function extractPromptFromMessages(messages) {
  return messages
    .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
    .join('\n\n') + '\n\nAssistant:';
}

/**
 * 转换网页API响应为标准API格式
 * @param {string} responseText - 网页API响应文本
 * @param {Object} originalRequest - 原始请求
 * @returns {string} 标准API格式响应
 */
async function transformWebResponse(responseText, originalRequest) {
  try {
    // 解析网页API响应
    const webResponse = JSON.parse(responseText);
    
    // 转换为标准API格式
    const standardResponse = {
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: webResponse.completion || webResponse.message || responseText
        }
      ],
      model: originalRequest.model || 'claude-3-sonnet',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: originalRequest.messages?.length || 0,
        output_tokens: Math.ceil((webResponse.completion || '').length / 4) || 0
      }
    };

    return JSON.stringify(standardResponse);
  } catch (error) {
    // 如果解析失败，返回简单格式
    return JSON.stringify({
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: responseText
        }
      ],
      model: originalRequest.model || 'claude-3-sonnet',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 0,
        output_tokens: Math.ceil(responseText.length / 4)
      }
    });
  }
}

/**
 * 获取CORS响应头
 * @returns {Object} CORS头
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

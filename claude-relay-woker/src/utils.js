/**
 * Claude Token 管理器工具函数
 */

import { CORS_CONFIG, ERROR_CODES, ERROR_MESSAGES, SUCCESS_CODES, SUCCESS_MESSAGES } from './config.js';

/**
 * 创建标准化的 JSON 响应
 * @param {any} data - 响应数据
 * @param {number} status - HTTP 状态码
 * @param {boolean} success - 操作是否成功
 * @param {Object} additionalHeaders - 附加的响应头
 * @returns {Response} 格式化的响应
 */
export function createJsonResponse(data, status = 200, success = true, additionalHeaders = {}) {
  const responseData = {
    success,
    code: success ? SUCCESS_CODES.TOKEN_STATUS_CHECKED : (data.code || ERROR_CODES.SYSTEM_INTERNAL_ERROR),
    message: success ? (data.message || SUCCESS_MESSAGES[SUCCESS_CODES.TOKEN_STATUS_CHECKED]) : (data.message || ERROR_MESSAGES[data.code] || '未知错误'),
    data: success ? data : null,
    timestamp: new Date().toISOString()
  };

  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };

  return new Response(JSON.stringify(responseData), { status, headers });
}

/**
 * 创建错误响应
 * @param {number} errorCode - 错误码
 * @param {string} customMessage - 自定义错误消息
 * @param {number} status - HTTP 状态码
 * @param {Object} additionalHeaders - 附加的响应头
 * @returns {Response} 错误响应
 */
export function createErrorResponse(errorCode, customMessage = null, status = 400, additionalHeaders = {}) {
  const errorData = {
    code: errorCode,
    message: customMessage || ERROR_MESSAGES[errorCode] || '未知错误'
  };
  return createJsonResponse(errorData, status, false, additionalHeaders);
}

/**
 * 创建成功响应
 * @param {any} data - 响应数据
 * @param {string} customMessage - 自定义成功消息
 * @param {Object} additionalHeaders - 附加的响应头
 * @returns {Response} 成功响应
 */
export function createSuccessResponse(data = null, customMessage = null, additionalHeaders = {}) {
  const responseData = {
    ...data,
    message: customMessage || SUCCESS_MESSAGES[SUCCESS_CODES.TOKEN_STATUS_CHECKED]
  };
  return createJsonResponse(responseData, 200, true, additionalHeaders);
}

/**
 * 创建 HTML 响应
 * @param {string} html - HTML 内容
 * @param {number} status - HTTP 状态码
 * @returns {Response} HTML 响应
 */
export function createHtmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * 处理 CORS 预检请求
 * @returns {Response} CORS 预检响应
 */
export function handleCorsOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': CORS_CONFIG.ALLOW_ORIGIN,
      'Access-Control-Allow-Methods': CORS_CONFIG.ALLOW_METHODS,
      'Access-Control-Allow-Headers': CORS_CONFIG.ALLOW_HEADERS
    }
  });
}

/**
 * 清理授权码，移除 URL 片段和参数
 * @param {string} code - 原始授权码
 * @returns {string} 清理后的授权码
 */
export function cleanAuthCode(code) {
  if (!code || typeof code !== 'string') {
    return '';
  }
  return code.split('#')[0].split('&')[0].split('?')[0].trim();
}

/**
 * 验证 token 是否过期
 * @param {Object} token - 包含 expires_at 属性的 token 对象
 * @returns {boolean} 如果 token 过期则返回 true
 */
export function isTokenExpired(token) {
  if (!token || !token.expires_at) {
    return true;
  }
  return Date.now() > token.expires_at;
}

/**
 * 创建用于存储的 token 信息对象
 * @param {Object} tokenData - 从 OAuth 响应中获取的原始 token 数据
 * @returns {Object} 格式化的 token 信息
 */
export function createTokenInfo(tokenData) {
  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in,
    expires_at: Date.now() + (tokenData.expires_in * 1000),
    scope: tokenData.scope,
    token_type: tokenData.token_type || 'Bearer',
    obtained_at: Date.now(),
    source: 'cf-worker-oauth'
  };
}

/**
 * 记录调试信息
 * @param {string} method - HTTP 方法
 * @param {string} pathname - 请求路径
 */
export function logRequest(method, pathname) {
  console.log(`请求: ${method} ${pathname}`);
}

/**
 * 记录错误信息
 * @param {string} context - 错误上下文
 * @param {Error} error - 错误对象
 */
export function logError(context, error) {
  console.error(`错误 - ${context}:`, error);
}

/**
 * 生成UUID
 * @returns {string} UUID字符串
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 解析Cookie字符串，提取sessionKey
 * @param {string} cookieString - Cookie字符串
 * @returns {Object} 解析结果
 */
export function parseCookie(cookieString) {
  if (!cookieString || typeof cookieString !== 'string') {
    return { sessionKey: null, isValid: false };
  }

  const sessionKeyMatch = cookieString.match(/sessionKey=([^;\\s]+)/);
  if (!sessionKeyMatch) {
    return { sessionKey: null, isValid: false };
  }

  const sessionKey = sessionKeyMatch[1];
  return {
    sessionKey: sessionKey,
    isValid: sessionKey.startsWith('sk-ant-sid01-') && sessionKey.length > 50
  };
}

/**
 * 格式化时间戳为可读字符串
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化的时间字符串
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return '从未';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * 安全地截断字符串用于显示
 * @param {string} str - 原字符串
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的字符串
 */
export function truncateString(str, maxLength = 50) {
  if (!str || str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '...';
}

/**
 * 创建请求头（用于Cookie请求）
 * @param {string} cookie - Cookie值
 * @param {Object} additionalHeaders - 额外请求头
 * @returns {Object} 请求头对象
 */
export function createCookieHeaders(cookie, additionalHeaders = {}) {
  return {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json',
    'Cookie': cookie,
    'Origin': 'https://claude.ai',
    'Referer': 'https://claude.ai/',
    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0',
    ...additionalHeaders
  };
}

/**
 * 检查响应是否表示认证失败
 * @param {Response} response - HTTP响应对象
 * @returns {boolean} 是否认证失败
 */
export async function isAuthenticationFailed(response) {
  if (response.status === 401) {
    return true;
  }
  
  if (response.status === 403) {
    return true;
  }
  
  // 检查响应体中的特定错误信息
  if (response.headers.get('content-type')?.includes('application/json')) {
    try {
      const data = await response.clone().json();
      if (data.error && data.error.type === 'authentication_error') {
        return true;
      }
    } catch (e) {
      // 忽略解析错误
    }
  }
  
  return false;
}

/**
 * 检查响应是否表示速率限制
 * @param {Response} response - HTTP响应对象
 * @returns {Object} 限流检查结果
 */
export async function checkRateLimit(response) {
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const resetTime = retryAfter ? 
      Date.now() + (parseInt(retryAfter) * 1000) : 
      Date.now() + (60 * 60 * 1000); // 默认1小时

    return {
      isRateLimited: true,
      resetTime: resetTime
    };
  }
  
  return {
    isRateLimited: false,
    resetTime: null
  };
}

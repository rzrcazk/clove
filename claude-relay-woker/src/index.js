/**
 * Claude Token 管理器 - Cloudflare Worker
 * 使用 ES6 导入的模块化版本
 */

import { ERROR_CODES } from './config.js';
import { getTokenPageHTML } from './templates.js';
import {
  handleCorsOptions,
  createErrorResponse,
  createSuccessResponse,
  createHtmlResponse,
  logRequest,
  logError
} from './utils.js';
import {
  handleGenerateAuthUrl,
  handleExchangeToken,
  handleTokenStatus,
  refreshAccessToken
} from './auth.js';
import {
  getCookieAccounts,
  createCookieAccount,
  deleteCookieAccount,
  getCookieAccountStats,
  recoverRateLimitedAccounts
} from './cookie.js';
import { handleMessages } from './api.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 调试日志
    logRequest(request.method, url.pathname);

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return handleCorsOptions();
    }

    try {
      // 路由处理
      switch (url.pathname) {
        case '/':
        case '/get-token':
          return createHtmlResponse(getTokenPageHTML());

        // OAuth路由
        case '/generate-auth-url':
          return handleGenerateAuthUrl(env);

        case '/exchange-token':
          return handleExchangeToken(request, env);

        case '/token-status':
          return handleTokenStatus(env);

        // Cookie管理路由
        case '/cookie/accounts':
          return handleCookieAccounts(request, env);

        case '/cookie/stats':
          return handleCookieStats(env);

        // API代理路由
        case '/v1/messages':
          return handleMessages(request, env);

        default:
          // 处理动态路由 /cookie/accounts/{id}
          if (url.pathname.startsWith('/cookie/accounts/')) {
            const accountId = url.pathname.split('/')[3];
            return handleCookieAccountById(request, env, accountId);
          }
          
          return createErrorResponse(ERROR_CODES.SYSTEM_NOT_FOUND, null, 404);
      }
    } catch (error) {
      logError('Worker错误', error);
      return createErrorResponse(ERROR_CODES.SYSTEM_INTERNAL_ERROR, `服务器内部错误: ${error.message}`, 500);
    }
  },

  async scheduled(controller, env, ctx) {
    console.log('定时任务开始执行 - Claude Token 自动刷新');
    
    try {
      const result = await refreshAccessToken(env);
      
      if (result.success) {
        console.log(`令牌刷新成功 - 新的过期时间: ${new Date(result.expiresAt).toISOString()}`);
      } else {
        console.error(`令牌刷新失败: ${result.error}`);
      }
    } catch (error) {
      console.error('定时任务执行错误:', error);
    }
    
    console.log('定时任务执行完成');
    
    // 同时恢复限流的Cookie账户
    try {
      const recoveredCount = await recoverRateLimitedAccounts(env);
      if (recoveredCount > 0) {
        console.log(`恢复了 ${recoveredCount} 个限流的Cookie账户`);
      }
    } catch (error) {
      console.error('恢复Cookie账户错误:', error);
    }
  }
};

/**
 * 处理Cookie账户列表请求 (GET/POST)
 * @param {Request} request - HTTP请求
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应
 */
async function handleCookieAccounts(request, env) {
  if (request.method === 'GET') {
    // 获取账户列表和统计信息
    try {
      const accounts = await getCookieAccounts(env);
      const stats = await getCookieAccountStats(env);
      
      return createSuccessResponse({
        accounts: accounts,
        stats: stats
      }, '获取Cookie账户列表成功');
    } catch (error) {
      logError('获取Cookie账户列表错误', error);
      return createErrorResponse(ERROR_CODES.SYSTEM_INTERNAL_ERROR, `获取账户列表失败: ${error.message}`, 500);
    }
    
  } else if (request.method === 'POST') {
    // 创建新账户
    try {
      const { name, cookie } = await request.json();
      return await createCookieAccount(env, name, cookie);
    } catch (error) {
      logError('创建Cookie账户错误', error);
      return createErrorResponse(ERROR_CODES.SYSTEM_INTERNAL_ERROR, `创建账户失败: ${error.message}`, 500);
    }
    
  } else {
    return createErrorResponse(ERROR_CODES.API_ONLY_POST_MESSAGES, '仅支持GET和POST请求', 405);
  }
}

/**
 * 处理单个Cookie账户操作 (DELETE)
 * @param {Request} request - HTTP请求
 * @param {Object} env - 环境变量
 * @param {string} accountId - 账户ID
 * @returns {Promise<Response>} 响应
 */
async function handleCookieAccountById(request, env, accountId) {
  if (request.method === 'DELETE') {
    return await deleteCookieAccount(env, accountId);
  } else {
    return createErrorResponse(ERROR_CODES.API_ONLY_POST_MESSAGES, '仅支持DELETE请求', 405);
  }
}

/**
 * 处理Cookie统计信息请求
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} 响应
 */
async function handleCookieStats(env) {
  try {
    const stats = await getCookieAccountStats(env);
    return createSuccessResponse(stats, '获取Cookie统计成功');
  } catch (error) {
    logError('获取Cookie统计错误', error);
    return createErrorResponse(ERROR_CODES.SYSTEM_INTERNAL_ERROR, `获取统计失败: ${error.message}`, 500);
  }
}

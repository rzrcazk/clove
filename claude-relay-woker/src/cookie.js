/**
 * Claude Relay Worker - Cookie认证管理
 * 处理基于Cookie的Claude.ai账户管理和认证
 */

import { COOKIE_CONFIG, ERROR_CODES, SUCCESS_MESSAGES } from './config.js';
import { createErrorResponse, createSuccessResponse, logError, generateUUID } from './utils.js';

/**
 * Cookie账户数据结构
 * @typedef {Object} CookieAccount
 * @property {string} id - 账户唯一标识
 * @property {string} name - 账户显示名称
 * @property {string} cookie - 完整Cookie值
 * @property {string} status - 账户状态: active|invalid|rate_limited
 * @property {number} last_used - 最后使用时间戳
 * @property {number} created_at - 创建时间戳
 * @property {number} usage_count - 使用次数
 * @property {number|null} rate_limit_reset - 限流重置时间戳
 * @property {Object} metadata - 额外元数据
 */

/**
 * 从KV获取Cookie账户列表
 * @param {Object} env - 环境变量
 * @returns {Promise<Array<CookieAccount>>} Cookie账户列表
 */
export async function getCookieAccounts(env) {
  try {
    const data = await env.CLAUDE_KV.get('cookie_accounts');
    if (!data) {
      return [];
    }
    
    const parsed = JSON.parse(data);
    return parsed.accounts || [];
  } catch (error) {
    logError('获取Cookie账户失败', error);
    return [];
  }
}

/**
 * 保存Cookie账户列表到KV
 * @param {Object} env - 环境变量
 * @param {Array<CookieAccount>} accounts - 账户列表
 * @returns {Promise<boolean>} 保存是否成功
 */
export async function saveCookieAccounts(env, accounts) {
  try {
    const data = {
      accounts: accounts,
      last_updated: Date.now(),
      version: '1.0'
    };
    
    await env.CLAUDE_KV.put('cookie_accounts', JSON.stringify(data));
    return true;
  } catch (error) {
    logError('保存Cookie账户失败', error);
    return false;
  }
}

/**
 * 验证Cookie格式
 * @param {string} cookie - Cookie字符串
 * @returns {Object} 验证结果
 */
export function validateCookie(cookie) {
  if (!cookie || typeof cookie !== 'string') {
    return { valid: false, error: 'Cookie不能为空' };
  }

  // 检查是否包含sessionKey
  if (!cookie.includes('sessionKey=')) {
    return { valid: false, error: 'Cookie必须包含sessionKey' };
  }

  // 提取sessionKey值
  const sessionKeyMatch = cookie.match(/sessionKey=([^;\s]+)/);
  if (!sessionKeyMatch) {
    return { valid: false, error: '无法提取sessionKey值' };
  }

  const sessionKey = sessionKeyMatch[1];
  
  // 验证sessionKey格式 (sk-ant-sid01-...)
  if (!sessionKey.startsWith('sk-ant-sid01-')) {
    return { valid: false, error: 'sessionKey格式不正确，应以sk-ant-sid01-开头' };
  }

  // 检查长度
  if (sessionKey.length < 50) {
    return { valid: false, error: 'sessionKey长度不足' };
  }

  return { 
    valid: true, 
    sessionKey: sessionKey,
    parsedCookie: cookie.trim()
  };
}

/**
 * 创建新的Cookie账户
 * @param {Object} env - 环境变量
 * @param {string} name - 账户名称
 * @param {string} cookie - Cookie值
 * @returns {Promise<Response>} 创建结果
 */
export async function createCookieAccount(env, name, cookie) {
  try {
    // 验证Cookie
    const validation = validateCookie(cookie);
    if (!validation.valid) {
      return createErrorResponse(ERROR_CODES.COOKIE_INVALID_FORMAT, validation.error, 400);
    }

    // 获取现有账户
    const accounts = await getCookieAccounts(env);
    
    // 检查是否已存在相同Cookie
    const existingAccount = accounts.find(acc => acc.cookie === validation.parsedCookie);
    if (existingAccount) {
      return createErrorResponse(ERROR_CODES.COOKIE_ALREADY_EXISTS, '该Cookie账户已存在', 409);
    }

    // 创建新账户
    const newAccount = {
      id: generateUUID(),
      name: name || `账户${accounts.length + 1}`,
      cookie: validation.parsedCookie,
      sessionKey: validation.sessionKey,
      status: 'active',
      last_used: null,
      created_at: Date.now(),
      usage_count: 0,
      rate_limit_reset: null,
      metadata: {
        user_agent: 'Claude-CF-Worker/1.0',
        created_by: 'cookie_manager'
      }
    };

    // 添加到列表并保存
    accounts.push(newAccount);
    const saved = await saveCookieAccounts(env, accounts);
    
    if (!saved) {
      return createErrorResponse(ERROR_CODES.SYSTEM_STORAGE_ERROR, '保存账户失败', 500);
    }

    return createSuccessResponse({
      account: {
        id: newAccount.id,
        name: newAccount.name,
        status: newAccount.status,
        created_at: newAccount.created_at
      }
    }, SUCCESS_MESSAGES.COOKIE_ACCOUNT_CREATED);
    
  } catch (error) {
    logError('创建Cookie账户错误', error);
    return createErrorResponse(ERROR_CODES.SYSTEM_INTERNAL_ERROR, `创建账户失败: ${error.message}`, 500);
  }
}

/**
 * 删除Cookie账户
 * @param {Object} env - 环境变量
 * @param {string} accountId - 账户ID
 * @returns {Promise<Response>} 删除结果
 */
export async function deleteCookieAccount(env, accountId) {
  try {
    const accounts = await getCookieAccounts(env);
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    
    if (accountIndex === -1) {
      return createErrorResponse(ERROR_CODES.COOKIE_ACCOUNT_NOT_FOUND, '账户不存在', 404);
    }

    // 删除账户
    const deletedAccount = accounts.splice(accountIndex, 1)[0];
    const saved = await saveCookieAccounts(env, accounts);
    
    if (!saved) {
      return createErrorResponse(ERROR_CODES.SYSTEM_STORAGE_ERROR, '删除账户失败', 500);
    }

    return createSuccessResponse({
      deletedAccount: {
        id: deletedAccount.id,
        name: deletedAccount.name
      }
    }, SUCCESS_MESSAGES.COOKIE_ACCOUNT_DELETED);
    
  } catch (error) {
    logError('删除Cookie账户错误', error);
    return createErrorResponse(ERROR_CODES.SYSTEM_INTERNAL_ERROR, `删除账户失败: ${error.message}`, 500);
  }
}

/**
 * 更新Cookie账户状态
 * @param {Object} env - 环境变量
 * @param {string} accountId - 账户ID
 * @param {Object} updates - 更新内容
 * @returns {Promise<boolean>} 更新是否成功
 */
export async function updateCookieAccount(env, accountId, updates) {
  try {
    const accounts = await getCookieAccounts(env);
    const account = accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      return false;
    }

    // 应用更新
    Object.assign(account, updates);
    
    return await saveCookieAccounts(env, accounts);
  } catch (error) {
    logError('更新Cookie账户错误', error);
    return false;
  }
}

/**
 * 获取可用的Cookie账户（负载均衡）
 * @param {Object} env - 环境变量
 * @returns {Promise<CookieAccount|null>} 可用账户或null
 */
export async function getAvailableCookieAccount(env) {
  try {
    const accounts = await getCookieAccounts(env);
    const now = Date.now();
    
    // 过滤可用账户
    const availableAccounts = accounts.filter(account => {
      // 检查基本状态
      if (account.status !== 'active') {
        return false;
      }
      
      // 检查是否在限流期间
      if (account.rate_limit_reset && now < account.rate_limit_reset) {
        return false;
      }
      
      return true;
    });

    if (availableAccounts.length === 0) {
      return null;
    }

    // 负载均衡策略：选择使用次数最少的账户
    availableAccounts.sort((a, b) => {
      // 首先按使用次数排序
      if (a.usage_count !== b.usage_count) {
        return a.usage_count - b.usage_count;
      }
      
      // 如果使用次数相同，按最后使用时间排序（越早越优先）
      if (a.last_used && b.last_used) {
        return a.last_used - b.last_used;
      }
      
      // 如果有一个从未使用过，优先选择未使用的
      if (!a.last_used) return -1;
      if (!b.last_used) return 1;
      
      return 0;
    });

    const selectedAccount = availableAccounts[0];
    
    // 更新使用统计
    await updateCookieAccount(env, selectedAccount.id, {
      last_used: now,
      usage_count: selectedAccount.usage_count + 1
    });

    return selectedAccount;
  } catch (error) {
    logError('获取可用Cookie账户错误', error);
    return null;
  }
}

/**
 * 标记账户为限流状态
 * @param {Object} env - 环境变量
 * @param {string} accountId - 账户ID
 * @param {number} resetTime - 限流重置时间戳
 * @returns {Promise<boolean>} 更新是否成功
 */
export async function markAccountRateLimited(env, accountId, resetTime = null) {
  const reset = resetTime || Date.now() + COOKIE_CONFIG.RATE_LIMIT_COOLDOWN;
  
  return await updateCookieAccount(env, accountId, {
    status: 'rate_limited', 
    rate_limit_reset: reset
  });
}

/**
 * 标记账户为无效状态
 * @param {Object} env - 环境变量
 * @param {string} accountId - 账户ID
 * @returns {Promise<boolean>} 更新是否成功
 */
export async function markAccountInvalid(env, accountId) {
  return await updateCookieAccount(env, accountId, {
    status: 'invalid'
  });
}

/**
 * 恢复限流账户（定时任务调用）
 * @param {Object} env - 环境变量
 * @returns {Promise<number>} 恢复的账户数量
 */
export async function recoverRateLimitedAccounts(env) {
  try {
    const accounts = await getCookieAccounts(env);
    const now = Date.now();
    let recoveredCount = 0;

    const updatedAccounts = accounts.map(account => {
      if (account.status === 'rate_limited' && 
          account.rate_limit_reset && 
          now >= account.rate_limit_reset) {
        
        account.status = 'active';
        account.rate_limit_reset = null;
        recoveredCount++;
      }
      return account;
    });

    if (recoveredCount > 0) {
      await saveCookieAccounts(env, updatedAccounts);
    }

    return recoveredCount;
  } catch (error) {
    logError('恢复限流账户错误', error);
    return 0;
  }
}

/**
 * 获取Cookie账户统计信息
 * @param {Object} env - 环境变量
 * @returns {Promise<Object>} 统计信息
 */
export async function getCookieAccountStats(env) {
  try {
    const accounts = await getCookieAccounts(env);
    const now = Date.now();
    
    const stats = {
      total: accounts.length,
      active: 0,
      invalid: 0,
      rate_limited: 0,
      total_usage: 0,
      last_used: null
    };

    accounts.forEach(account => {
      stats.total_usage += account.usage_count;
      
      if (account.last_used && (!stats.last_used || account.last_used > stats.last_used)) {
        stats.last_used = account.last_used;
      }
      
      if (account.status === 'active') {
        stats.active++;
      } else if (account.status === 'invalid') {
        stats.invalid++;
      } else if (account.status === 'rate_limited') {
        // 检查是否还在限流期间
        if (account.rate_limit_reset && now < account.rate_limit_reset) {
          stats.rate_limited++;
        } else {
          stats.active++; // 限流已过期，应被视为可用
        }
      }
    });

    return stats;
  } catch (error) {
    logError('获取Cookie统计错误', error);
    return {
      total: 0,
      active: 0,
      invalid: 0,
      rate_limited: 0,
      total_usage: 0,
      last_used: null
    };
  }
}
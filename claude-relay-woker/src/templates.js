/**
 * Claude Token 管理器 Web 界面的 HTML 模板
 */

import { UI_TEXT } from './config.js';

// Web 界面的 CSS 样式
export const CSS_STYLES = `
  body { font-family: Arial, sans-serif; max-width: 1000px; margin: 30px auto; padding: 20px; background: #f5f5f5; }
  .container { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .nav { display: flex; gap: 15px; margin-bottom: 30px; border-bottom: 2px solid #e0e0e0; padding-bottom: 15px; }
  .nav-tab { padding: 10px 20px; border: none; background: #f0f0f0; border-radius: 6px; cursor: pointer; font-size: 16px; transition: all 0.3s; }
  .nav-tab.active { background: #007cba; color: white; }
  .nav-tab:hover:not(.active) { background: #e0e0e0; }
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  .card { background: #f9f9f9; border-radius: 8px; padding: 25px; margin: 20px 0; border: 1px solid #e0e0e0; }
  .button { background: #007cba; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; transition: background 0.3s; }
  .button:hover { background: #005a87; }
  .button-secondary { background: #6c757d; }
  .button-secondary:hover { background: #545b62; }
  .button-danger { background: #dc3545; }
  .button-danger:hover { background: #c82333; }
  .button-small { padding: 6px 12px; font-size: 14px; }
  .status { padding: 12px; margin: 15px 0; border-radius: 6px; }
  .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
  .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
  .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
  .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
  .code { background: #f4f4f4; padding: 12px; border-radius: 6px; font-family: monospace; border: 1px solid #ddd; }
  .input-group { margin: 15px 0; }
  .input-group label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
  .input-group input, .input-group textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; }
  .input-group small { color: #666; font-size: 14px; }
  .account-list { margin-top: 20px; }
  .account-item { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 10px 0; }
  .account-header { display: flex; justify-content: between; align-items: center; margin-bottom: 10px; }
  .account-name { font-size: 18px; font-weight: bold; color: #333; }
  .account-status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
  .status-active { background: #d4edda; color: #155724; }
  .status-invalid { background: #f8d7da; color: #721c24; }
  .status-rate-limited { background: #fff3cd; color: #856404; }
  .account-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; color: #666; font-size: 14px; }
  .account-actions { display: flex; gap: 10px; justify-content: flex-end; }
  .cookie-preview { background: #f8f9fa; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #666; margin: 10px 0; word-break: break-all; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
  .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
  .stat-value { font-size: 32px; font-weight: bold; }
  .stat-label { font-size: 14px; opacity: 0.9; margin-top: 5px; }
  .loading { text-align: center; padding: 20px; color: #666; }
  .empty-state { text-align: center; padding: 40px; color: #666; }
  .empty-state .icon { font-size: 48px; margin-bottom: 15px; }
`;

// Cookie管理的JavaScript代码
export const COOKIE_JAVASCRIPT = `
  let cookieAccounts = [];
  let cookieStats = {};
  
  // 标签切换功能
  function switchTab(tabName) {
    // 隐藏所有标签内容
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // 移除所有标签的active状态
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // 显示目标标签内容
    document.getElementById(tabName + '-tab').classList.add('active');
    document.querySelector('[data-tab="' + tabName + '"]').classList.add('active');
    
    // 根据标签加载相应数据
    if (tabName === 'cookie') {
      loadCookieAccounts();
    } else if (tabName === 'oauth') {
      checkStatus();
    }
  }
  
  // Cookie账户管理功能
  async function loadCookieAccounts() {
    try {
      const response = await fetch('/cookie/accounts');
      const data = await response.json();
      
      if (data.success) {
        cookieAccounts = data.data.accounts || [];
        cookieStats = data.data.stats || {};
        renderCookieAccounts();
        renderCookieStats();
      } else {
        showMessage('cookie-message', 'error', data.message);
      }
    } catch (error) {
      showMessage('cookie-message', 'error', '加载Cookie账户失败: ' + error.message);
    }
  }
  
  async function addCookieAccount() {
    const name = document.getElementById('cookie-name').value.trim();
    const cookie = document.getElementById('cookie-value').value.trim();
    
    if (!cookie) {
      showMessage('cookie-message', 'error', '请输入Cookie值');
      return;
    }
    
    try {
      const response = await fetch('/cookie/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || undefined, cookie })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('cookie-message', 'success', data.message);
        document.getElementById('cookie-name').value = '';
        document.getElementById('cookie-value').value = '';
        loadCookieAccounts();
      } else {
        showMessage('cookie-message', 'error', data.message);
      }
    } catch (error) {
      showMessage('cookie-message', 'error', '添加账户失败: ' + error.message);
    }
  }
  
  async function deleteCookieAccount(accountId) {
    if (!confirm('确定要删除这个Cookie账户吗？')) {
      return;
    }
    
    try {
      const response = await fetch('/cookie/accounts/' + accountId, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('cookie-message', 'success', data.message);
        loadCookieAccounts();
      } else {
        showMessage('cookie-message', 'error', data.message);
      }
    } catch (error) {
      showMessage('cookie-message', 'error', '删除账户失败: ' + error.message);
    }
  }
  
  function renderCookieAccounts() {
    const container = document.getElementById('cookie-accounts-list');
    
    if (cookieAccounts.length === 0) {
      container.innerHTML = \`
        <div class="empty-state">
          <div class="icon">🍪</div>
          <h3>暂无Cookie账户</h3>
          <p>添加您的第一个Cookie账户开始使用</p>
        </div>
      \`;
      return;
    }
    
    container.innerHTML = cookieAccounts.map(account => \`
      <div class="account-item">
        <div class="account-header">
          <div class="account-name">\${account.name}</div>
          <div class="account-status status-\${account.status}">
            \${getStatusText(account.status)}
          </div>
        </div>
        <div class="account-meta">
          <div><strong>使用次数:</strong> \${account.usage_count || 0}</div>
          <div><strong>最后使用:</strong> \${formatTime(account.last_used)}</div>
          <div><strong>创建时间:</strong> \${formatTime(account.created_at)}</div>
          <div><strong>限流重置:</strong> \${account.rate_limit_reset ? formatTime(account.rate_limit_reset) : '无'}</div>
        </div>
        <div class="cookie-preview">
          \${truncateCookie(account.cookie)}
        </div>
        <div class="account-actions">
          <button class="button button-danger button-small" onclick="deleteCookieAccount('\${account.id}')">
            删除
          </button>
        </div>
      </div>
    \`).join('');
  }
  
  function renderCookieStats() {
    const container = document.getElementById('cookie-stats');
    container.innerHTML = \`
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">\${cookieStats.total || 0}</div>
          <div class="stat-label">总账户数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${cookieStats.active || 0}</div>
          <div class="stat-label">可用账户</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${cookieStats.invalid || 0}</div>
          <div class="stat-label">无效账户</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">\${cookieStats.rate_limited || 0}</div>
          <div class="stat-label">限流中</div>
        </div>
      </div>
    \`;
  }
  
  function getStatusText(status) {
    const statusMap = {
      'active': '正常',
      'invalid': '无效', 
      'rate_limited': '限流中'
    };
    return statusMap[status] || status;
  }
  
  function truncateCookie(cookie) {
    if (!cookie) return '';
    return cookie.length > 100 ? cookie.substring(0, 100) + '...' : cookie;
  }
  
  function formatTime(timestamp) {
    if (!timestamp) return '从未';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return minutes + '分钟前';
    if (hours < 24) return hours + '小时前';  
    if (days < 7) return days + '天前';
    return date.toLocaleDateString();
  }
  
  function showMessage(containerId, type, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = \`
      <div class="status \${type}">
        <strong>\${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</strong> \${message}
      </div>
    \`;
    
    // 3秒后自动清除消息
    setTimeout(() => {
      container.innerHTML = '';
    }, 3000);
  }
`;

// OAuth管理的JavaScript代码  
export const OAUTH_JAVASCRIPT = `
  let currentPkce = null;
  
  async function generateAuthUrl() {
      try {
          const response = await fetch('/generate-auth-url');
          const data = await response.json();
          
          if (!data.success) {
              throw new Error(data.message);
          }
          
          currentPkce = data.data.pkce;
          
          document.getElementById('oauth-auth-url-result').innerHTML = \`
              <div class="status success">
                  <strong>✅ 授权链接已生成</strong><br>
                  <a href="\${data.data.authUrl}" target="_blank" style="color: #007cba; text-decoration: underline;">
                      点击这里在新窗口中授权
                  </a><br>
                  <small>授权完成后，请从地址栏复制 code 参数的值</small>
              </div>
          \`;
      } catch (error) {
          document.getElementById('oauth-auth-url-result').innerHTML = \`
              <div class="status error">
                  <strong>❌ 生成失败:</strong> \${error.message}
              </div>
          \`;
      }
  }
  
  async function submitAuthCode() {
      let authCode = document.getElementById('oauth-auth-code').value.trim();
      if (!authCode) {
          alert('请输入授权码');
          return;
      }
      
      // 清理授权码：移除 # 后面的部分和其他参数
      authCode = authCode.split('#')[0].split('&')[0].split('?')[0];
      
      if (!currentPkce) {
          alert('请先生成授权链接');
          return;
      }
      
      try {
          const response = await fetch('/exchange-token', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  code: authCode,
                  pkce: currentPkce
              })
          });
          
          const data = await response.json();
          
          if (!data.success) {
              throw new Error(data.message);
          }
          
          document.getElementById('oauth-submit-result').innerHTML = \`
              <div class="status success">
                  <strong>🎉 Token 获取成功!</strong><br>
                  现在可以使用 Claude Code 了！
              </div>
          \`;
          
          // 清空输入框
          document.getElementById('oauth-auth-code').value = '';
          currentPkce = null;
          
          // 自动刷新状态
          setTimeout(checkStatus, 1000);
          
      } catch (error) {
          document.getElementById('oauth-submit-result').innerHTML = \`
              <div class="status error">
                  <strong>❌ 提交失败:</strong> \${error.message}
              </div>
          \`;
      }
  }
  
  async function checkStatus() {
      try {
          const response = await fetch('/token-status');
          const data = await response.json();
          const statusDiv = document.getElementById('oauth-status-result');
          
          if (data.data && data.data.hasToken) {
              statusDiv.innerHTML = \`
                  <div class="status success">
                      <strong>✅ Token 状态: 正常</strong><br>
                      过期时间: \${new Date(data.data.expiresAt).toLocaleString()}<br>
                      获取时间: \${new Date(data.data.obtainedAt).toLocaleString()}
                  </div>
              \`;
          } else {
              statusDiv.innerHTML = \`
                  <div class="status warning">
                      <strong>⚠️ 未找到有效 Token</strong><br>
                      请点击上方按钮获取新的 Token
                  </div>
              \`;
          }
      } catch (error) {
          document.getElementById('oauth-status-result').innerHTML = \`
              <div class="status error">
                  <strong>❌ 检查失败:</strong> \${error.message}
              </div>
          \`;
      }
  }
  
  // OAuth状态检查函数（由主页面调用）
  function initOAuth() {
    checkStatus();
  }
`;

// 生成统一管理页面的 HTML 模板
export function getManagementPageHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${UI_TEXT.PAGE_TITLE}</title>
    <style>
        ${CSS_STYLES}
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 ${UI_TEXT.PAGE_TITLE}</h1>
        
        <!-- 标签导航 -->
        <div class="nav">
            <button class="nav-tab active" id="cookie-tab" onclick="switchTab('cookie')" data-tab="cookie">
                🍪 ${UI_TEXT.COOKIE_MANAGEMENT}
            </button>
            <button class="nav-tab" id="oauth-tab" onclick="switchTab('oauth')" data-tab="oauth">
                🔐 OAuth 管理
            </button>
        </div>
        
        <!-- Cookie 管理标签 -->
        <div class="tab-content active" data-tab="cookie">
            <div class="card">
                <h2>📊 账户统计</h2>
                <div id="cookie-stats"></div>
            </div>
            
            <div class="card">
                <h2>➕ ${UI_TEXT.ADD_COOKIE_ACCOUNT}</h2>
                <div id="cookie-message"></div>
                
                <div class="input-group">
                    <label for="cookie-name">${UI_TEXT.ACCOUNT_NAME_PLACEHOLDER}</label>
                    <input type="text" id="cookie-name" placeholder="${UI_TEXT.ACCOUNT_NAME_PLACEHOLDER}">
                </div>
                
                <div class="input-group">
                    <label for="cookie-value">Cookie 值 *</label>
                    <textarea id="cookie-value" rows="4" placeholder="${UI_TEXT.COOKIE_PLACEHOLDER}"></textarea>
                    <small>💡 提示：粘贴从浏览器开发者工具中复制的完整Cookie值</small>
                </div>
                
                <button class="button" onclick="addCookieAccount()">添加账户</button>
            </div>
            
            <div class="card">
                <h2>📋 ${UI_TEXT.COOKIE_ACCOUNTS_LIST}</h2>
                <div id="cookie-accounts-list">
                    <div class="loading">正在加载...</div>
                </div>
            </div>
        </div>
        
        <!-- OAuth 管理标签 -->
        <div class="tab-content" data-tab="oauth">
            <div class="card">
                <h2>📋 ${UI_TEXT.GET_NEW_TOKEN}</h2>
                <p>由于 Claude OAuth 限制，需要手动完成授权流程：</p>
                <ol>
                    <li>点击下面的按钮获取授权链接</li>
                    <li>在新窗口中完成 Claude 授权</li>
                    <li>复制授权码并粘贴到下面的输入框</li>
                    <li>点击提交完成设置</li>
                </ol>
                <button class="button" onclick="generateAuthUrl()">${UI_TEXT.GENERATE_AUTH_LINK}</button>
                <div id="oauth-auth-url-result" style="margin-top: 15px;"></div>
                
                <div class="input-group" style="margin-top: 20px;">
                    <label for="oauth-auth-code">授权码 (Authorization Code):</label>
                    <input type="text" id="oauth-auth-code" placeholder="${UI_TEXT.AUTH_CODE_PLACEHOLDER}">
                    <small>${UI_TEXT.AUTH_CODE_HINT}</small>
                </div>
                <button class="button" onclick="submitAuthCode()">${UI_TEXT.SUBMIT_AUTH_CODE}</button>
                <div id="oauth-submit-result"></div>
            </div>
            
            <div class="card">
                <h2>📊 ${UI_TEXT.TOKEN_STATUS}</h2>
                <button class="button" onclick="checkStatus()">${UI_TEXT.CHECK_STATUS}</button>
                <div id="oauth-status-result"></div>
            </div>
        </div>
        
        <div class="card">
            <h2>🔗 ${UI_TEXT.API_USAGE}</h2>
            <p><strong>API 端点:</strong></p>
            <div class="code">POST \${window.location.origin}/v1/messages</div>
            <p><strong>使用方法:</strong></p>
            <ul>
                <li>设置 Claude Code 的 ANTHROPIC_BASE_URL 为: <code>\${window.location.origin}/</code></li>
                <li>设置 ANTHROPIC_AUTH_TOKEN 为任意值（系统会自动处理认证）</li>
                <li>支持 OAuth 和 Cookie 双模式自动切换</li>
            </ul>
        </div>
    </div>

    <script>
        ${COOKIE_JAVASCRIPT}
        ${OAUTH_JAVASCRIPT}
        
        // 页面加载时初始化
        window.onload = function() {
            // 默认显示Cookie管理标签
            switchTab('cookie');
            // 同时初始化OAuth状态检查
            initOAuth();
        };
    </script>
</body>
</html>`;
}

// 保留原有的Token页面函数以保持向后兼容
export function getTokenPageHTML() {
  return getManagementPageHTML();
}
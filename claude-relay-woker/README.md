# Claude Relay Worker

一个 Cloudflare Workers 代理服务，让你可以通过 Claude Code 使用 Claude API，而无需直接管理 API 密钥。

## 🎯 这是什么？

Claude Relay Worker 解决了一个简单的问题：让你能够安全、便捷地使用 Claude API。

**它提供：**
- 🔐 OAuth 身份验证（无需手动管理 API 密钥）
- 🍪 Cookie 认证模式（支持多账户负载均衡）
- 🔄 智能认证切换（OAuth优先，Cookie降级）
- 🌐 API 代理转发（自动处理认证）
- 📱 统一的 Web 管理界面
- ⚡ 全球边缘部署（低延迟）

## 🚀 如何使用

### 1. 部署服务

```bash
git clone https://github.com/your-username/claude-relay-worker.git
cd claude-relay-worker

# 配置 wrangler
cp wrangler.toml.example wrangler.toml
# 编辑 wrangler.toml，填入你的实际配置

npx wrangler deploy
```

### 2. 设置认证方式

访问你的 Worker URL（如：`https://your-worker.workers.dev/`），选择认证方式：

#### 方式一：OAuth 认证（推荐）
1. 切换到"OAuth 管理"标签
2. 点击"生成授权链接" → 完成 Claude 授权
3. 复制授权码并提交

#### 方式二：Cookie 认证（多账户支持）
1. 切换到"Cookie 账户管理"标签
2. 从浏览器开发者工具复制 Claude.ai 的完整 Cookie
3. 添加到系统中（支持多个账户）
4. 系统会自动进行负载均衡和故障转移

### 3. 配置 Claude Code

```bash
export ANTHROPIC_BASE_URL="https://your-worker.workers.dev/"
export ANTHROPIC_AUTH_TOKEN="placeholder"
```

### 4. 使用 Claude Code
```bash
claude
```

就是这样！现在你可以正常使用 Claude Code 了。

## ❓ 为什么需要这个？

- **安全性**：令牌存储在云端，不暴露在本地
- **便捷性**：一次设置，多设备使用
- **稳定性**：自动处理令牌刷新和错误重试
- **高可用**：双模式认证，多账户负载均衡
- **智能切换**：OAuth优先，故障时自动降级到Cookie模式

## 🔧 配置说明

编辑 `wrangler.toml` 文件，替换以下配置：

```toml
# 替换为你的 Cloudflare 账户 ID
account_id = "your-cloudflare-account-id"

[[kv_namespaces]]
binding = "CLAUDE_KV"
# 替换为你的 KV 命名空间 ID
id = "your-kv-namespace-id"
```

**获取方式：**
1. **account_id**：Cloudflare Dashboard 右侧边栏
2. **KV namespace ID**：Workers & Pages → KV → 创建命名空间后获取

## 🍪 Cookie 模式详细说明

### 如何获取 Cookie

1. 打开浏览器，访问 [claude.ai](https://claude.ai) 并登录
2. 按 F12 打开开发者工具
3. 切换到 "Application" 或 "存储" 标签
4. 在左侧找到 "Cookies" → "https://claude.ai"
5. 复制 `sessionKey` 的完整值（以 `sk-ant-sid01-` 开头）
6. 或者在 Network 标签中找到任意请求，复制完整的 Cookie 请求头

### Cookie 模式特性

- ✅ **多账户支持**：可添加多个 Cookie 账户
- ✅ **负载均衡**：自动分配请求到不同账户
- ✅ **故障转移**：无效账户自动标记并跳过
- ✅ **限流处理**：被限流账户自动暂停使用
- ✅ **统计监控**：实时显示账户状态和使用情况

### 智能认证流程

1. **OAuth 优先**：首先尝试使用 OAuth 令牌
2. **Cookie 降级**：OAuth 失败时自动切换到 Cookie 模式
3. **负载均衡**：在多个 Cookie 账户间智能分配
4. **故障重试**：单个账户失败时自动尝试其他账户
5. **状态监控**：实时更新账户状态，自动恢复限流账户

## 📝 许可证

MIT License

---

⭐ 如果对你有帮助，请给个星标！

# Clove 项目文档索引 🍀

> **Clove** - 全力以赴的 Claude 反向代理 ✨  
> 版本: v0.3.1 | 许可证: MIT | Python 3.11+

---

## 📋 项目概览

**Clove** 是一个功能强大的 Claude.ai 反向代理工具，支持通过标准 Claude API 访问 Claude.ai，包括首创的 OAuth 认证支持。

### 🎯 核心特性
- **双模式运行**: OAuth + 网页反代
- **超高兼容性**: 支持 SillyTavern、Claude Code 等应用  
- **智能功能**: 自动认证、智能切换、配额管理
- **现代界面**: React + FastAPI 全栈应用

### 🏗️ 技术架构
```
┌─ Frontend (React + TypeScript)
│  ├─ UI Components (Shadcn UI + Tailwind)
│  ├─ State Management (React Hooks)
│  └─ Build Tools (Vite + ESLint)
│
├─ Backend (FastAPI + Python)
│  ├─ API Routes (/v1, /api/admin/*)
│  ├─ Core Services (Account, OAuth, Session)
│  ├─ Processors (Claude AI Pipeline)
│  └─ External Integration (Claude Client)
│
└─ Configuration
   ├─ Environment (.env)
   ├─ JSON Config (config.json)
   └─ Package Management (pyproject.toml)
```

---

## 📁 项目结构

### 🏠 根目录
| 文件/目录 | 说明 | 类型 |
|----------|------|------|
| `app/` | Python 后端应用 | 核心 |
| `front/` | React 前端应用 | 核心 |
| `claude-relay-woker/` | Cloudflare Workers 中继服务 | 扩展 |
| `scripts/` | 构建和部署脚本 | 工具 |
| `README.md` / `README_en.md` | 项目说明文档 | 文档 |
| `PROJECT_INDEX.md` | 项目文档索引 | 文档 |
| `pyproject.toml` | Python 项目配置 | 配置 |
| `requirements.txt` | Python 依赖列表 | 配置 |
| `docker-compose.yml` | Docker 编排配置 | 部署 |
| `Dockerfile*` | Docker 镜像构建 | 部署 |
| `Makefile` | 构建自动化 | 工具 |
| `uv.lock` | UV 包管理器锁定文件 | 配置 |

### 🔧 后端结构 (`app/`)
```
app/
├── api/                    # API 路由层
│   ├── main.py            # 路由注册中心
│   └── routes/            # 具体路由实现
│       ├── claude.py      # Claude API 兼容接口
│       ├── accounts.py    # 账户管理
│       ├── settings.py    # 设置管理
│       └── statistics.py  # 统计信息
│
├── core/                   # 核心业务逻辑
│   ├── config.py          # 配置管理
│   ├── account.py         # 账户核心逻辑
│   ├── claude_session.py  # Claude 会话管理
│   ├── error_handler.py   # 错误处理
│   ├── exceptions.py      # 自定义异常
│   ├── external/          # 外部服务集成
│   │   └── claude_client.py # Claude 客户端
│   ├── http_client.py     # HTTP 客户端封装
│   └── static.py          # 静态资源管理
│
├── models/                 # 数据模型
│   ├── claude.py          # Claude 相关模型
│   ├── internal.py        # 内部数据模型
│   └── streaming.py       # 流式响应模型
│
├── processors/             # 消息处理管道
│   ├── base.py            # 基础处理器
│   ├── pipeline.py        # 处理管道
│   └── claude_ai/         # Claude AI 专用处理器
│       ├── claude_api_processor.py        # API 模式处理
│       ├── claude_web_processor.py        # 网页模式处理
│       ├── streaming_response_processor.py # 流式响应
│       ├── tool_call_event_processor.py   # 工具调用事件
│       └── ... (其他专用处理器)
│
├── services/               # 业务服务层
│   ├── account.py         # 账户服务
│   ├── cache.py           # 缓存服务
│   ├── i18n.py            # 国际化服务
│   ├── oauth.py           # OAuth 认证服务
│   ├── session.py         # 会话管理服务
│   ├── tool_call.py       # 工具调用服务
│   └── event_processing/  # 事件处理服务
│
├── utils/                  # 工具函数
│   ├── logger.py          # 日志工具
│   ├── messages.py        # 消息处理工具
│   └── retry.py           # 重试机制
│
├── dependencies/           # 依赖注入
│   └── auth.py            # 认证依赖
│
├── locales/               # 国际化文件
│   ├── en.json           # 英文
│   └── zh.json           # 中文
│
└── main.py               # 应用程序入口
```

### 🎨 前端结构 (`front/`)
```
front/
├── src/
│   ├── api/              # API 客户端
│   │   ├── client.ts     # HTTP 客户端封装
│   │   └── types.ts      # TypeScript 类型定义
│   │
│   ├── components/       # React 组件
│   │   ├── ui/          # 基础 UI 组件 (Shadcn)
│   │   ├── Layout.tsx    # 布局组件
│   │   ├── BatchCookieModal.tsx # 批量 Cookie 管理
│   │   ├── AccountModal.tsx     # 账户管理模态框
│   │   └── OAuthModal.tsx       # OAuth 认证模态框
│   │
│   ├── pages/            # 页面组件
│   │   ├── Dashboard.tsx # 仪表板
│   │   ├── Accounts.tsx  # 账户管理页
│   │   ├── Settings.tsx  # 设置页
│   │   └── Login.tsx     # 登录页
│   │
│   ├── hooks/            # React Hooks
│   │   └── use-mobile.ts # 移动端检测
│   │
│   ├── lib/              # 工具库
│   │   └── utils.ts      # 通用工具函数
│   │
│   ├── utils/            # 业务工具
│   │   └── validators.ts # 表单验证
│   │
│   ├── App.tsx           # 应用根组件
│   ├── main.tsx          # 应用入口
│   └── index.css         # 全局样式
│
├── public/               # 静态资源
├── package.json          # 项目配置
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
└── prettier.config.cjs   # 代码格式化配置
```

### ☁️ Cloudflare Workers 结构 (`claude-relay-woker/`)
```
claude-relay-woker/
├── src/
│   ├── index.js          # Worker 主入口
│   ├── api.js           # API 处理逻辑
│   ├── auth.js          # OAuth 认证处理
│   ├── config.js        # 配置管理
│   ├── templates.js     # HTML 模板
│   └── utils.js         # 工具函数
│
├── wrangler.toml.example # Wrangler 配置模板
└── README.md            # Workers 服务说明
```

---

## 🚀 快速导航

### 🔍 核心功能索引
| 功能模块 | 核心文件 | 说明 |
|----------|----------|------|
| **认证系统** | `app/services/oauth.py` | OAuth 认证服务 |
| **账户管理** | `app/services/account.py` | 账户管理器 (单例模式) |
| **会话管理** | `app/services/session.py` | Claude 会话管理 |
| **消息处理** | `app/processors/claude_ai/pipeline.py` | 消息处理管道 |
| **缓存系统** | `app/services/cache.py` | 缓存和检查点服务 |
| **工具调用** | `app/services/tool_call.py` | Function Calling 支持 |
| **流式响应** | `app/processors/claude_ai/streaming_response_processor.py` | 流式消息处理 |
| **错误处理** | `app/core/error_handler.py` | 全局异常处理 |
| **国际化** | `app/services/i18n.py` | 多语言支持 |
| **前端路由** | `front/src/App.tsx` | React 路由配置 |
| **API 客户端** | `front/src/api/client.ts` | 前端 HTTP 客户端 |
| **UI 组件** | `front/src/components/ui/` | Shadcn UI 组件库 |

### 📖 文档资源
| 文档 | 位置 | 描述 |
|------|------|------|
| 用户指南 | `README.md` | 安装、使用、配置说明 |
| 英文文档 | `README_en.md` | English documentation |
| 项目配置 | `pyproject.toml` | Python 项目元数据 |
| 依赖管理 | `requirements.txt` | Python 依赖列表 |
| 前端配置 | `front/package.json` | 前端项目配置 |

### 🔧 开发工具
| 工具 | 配置文件 | 用途 |
|------|----------|------|
| Python | `pyproject.toml` | 包管理、构建配置 |
| TypeScript | `front/tsconfig.json` | 类型检查配置 |
| ESLint | `front/eslint.config.js` | 代码质量检查 |
| Prettier | `front/prettier.config.cjs` | 代码格式化 |
| Vite | `front/vite.config.ts` | 前端构建工具 |
| Docker | `Dockerfile*` | 容器化部署 |
| Make | `Makefile` | 自动化构建 |

### 🛠️ 核心模块
| 模块 | 位置 | 功能 |
|------|------|------|
| API 路由 | `app/api/` | HTTP 接口定义 |
| 业务逻辑 | `app/core/` | 核心功能实现 |
| 数据模型 | `app/models/` | 数据结构定义 |
| 消息处理 | `app/processors/` | Claude AI 消息处理管道 |
| 业务服务 | `app/services/` | 高级业务逻辑 |
| React 组件 | `front/src/components/` | UI 组件库 |
| 页面组件 | `front/src/pages/` | 应用页面 |
| Cloudflare Worker | `claude-relay-woker/` | 云端中继服务 |

---

## 🔗 API 接口文档

### Claude API 兼容接口 (`/v1`)
- **POST** `/v1/messages` - Claude 消息接口 (兼容 Anthropic API)
- **GET** `/v1/models` - 获取可用模型列表

### 管理接口 (`/api/admin`)
#### 账户管理 (`/accounts`)
- **GET** `/api/admin/accounts` - 获取账户列表
- **POST** `/api/admin/accounts` - 添加新账户
- **PUT** `/api/admin/accounts/{id}` - 更新账户
- **DELETE** `/api/admin/accounts/{id}` - 删除账户

#### 设置管理 (`/settings`) 
- **GET** `/api/admin/settings` - 获取当前设置
- **PUT** `/api/admin/settings` - 更新设置

#### 统计信息 (`/statistics`)
- **GET** `/api/admin/statistics` - 获取使用统计

---

## 🎯 关键特性详解

### 1. 🔐 双模式认证
- **OAuth 模式**: 通过官方 Claude API，支持完整功能
- **网页反代模式**: 模拟 Claude.ai 网页版，兼容性强

### 2. 🔄 智能处理管道
消息处理采用管道模式，支持：
- 流式/非流式响应
- 工具调用 (Function Calling)
- 停止序列处理
- Token 计数估算
- 模型注入和上下文管理

### 3. 🌐 国际化支持
- 中文/英文双语界面
- 可扩展的本地化系统
- 动态语言切换

### 4. 📊 监控与统计
- 实时使用统计
- 账户状态监控
- 配额管理和重置

---

## 🚀 开发与部署

### 本地开发
```bash
# 后端开发
cd app/
pip install -r requirements.txt
python main.py

# 前端开发  
cd front/
pnpm install
pnpm dev
```

### Docker 部署
```bash
# 标准部署
docker-compose up -d

# PyPI 构建
docker build -f Dockerfile.pypi -t clove:pypi .

# Hugging Face 部署
docker build -f Dockerfile.huggingface -t clove:hf .
```

### 构建分发
```bash
# Python 包构建
make build

# 或使用脚本
python scripts/build_wheel.py
```

### 部署选项
| 部署方式 | 配置文件 | 适用场景 |
|----------|----------|----------|
| **标准部署** | `Dockerfile` | 生产环境，完整功能 |
| **PyPI 安装** | `Dockerfile.pypi` | 快速部署，从 PyPI 安装 |
| **Hugging Face** | `Dockerfile.huggingface` | 在线演示，HF Spaces |
| **本地开发** | `docker-compose.yml` | 开发环境，调试配置 |
| **Cloudflare Workers** | `claude-relay-woker/` | 无服务器，全球边缘部署 |

---

## 📞 支持与贡献

### 问题反馈
- GitHub Issues: [https://github.com/mirrorange/clove/issues](https://github.com/mirrorange/clove/issues)
- 邮件联系: orange@freesia.ink

### 开发贡献
1. Fork 项目
2. 创建功能分支
3. 提交代码改动
4. 创建 Pull Request

### 许可证
MIT License - 详见 `LICENSE` 文件

---

**更新时间**: 2025-07-25  
**当前版本**: v0.3.1  
**维护者**: mirrorange (orange@freesia.ink)  
**项目地址**: [https://github.com/mirrorange/clove](https://github.com/mirrorange/clove)
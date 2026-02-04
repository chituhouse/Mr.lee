# 技术栈选型调研（V1）

## 结论先行

| 层级 | 选型 | 理由 |
|------|------|------|
| 热搜采集 | DailyHotApi 自部署 | 50+ 平台、Vercel 一键部署、免费 |
| 深度采集（备用） | DrissionPage | 反爬能力强、中文友好、HTTP/浏览器可切换 |
| 定时调度 | APScheduler | 轻量、灵活、零外部依赖 |
| LLM 主力 | DeepSeek V3 | 性价比最高（比 GPT 便宜 10-30 倍）、中文写作好、国内直连 |
| LLM 备用 | 通义千问 qwen-plus | 免费额度多、DeepSeek 不可用时降级 |
| LLM SDK | openai (Python) | DeepSeek 兼容 OpenAI 格式，一套代码调两家 |
| 飞书写入 | lark-oapi | 官方 SDK、稳定可靠 |
| 配置管理 | python-dotenv + .env | 简单直接、敏感信息不入库 |
| 日志 | loguru | 开箱即用、自带文件轮转 |
| 部署 | 轻量云服务器 + supervisor | 稳定、便宜、支持 Chromium |

**预估月成本：¥400-900（服务器 ¥50-100 + LLM API ¥300-800）**

---

## 各维度详细对比

### 1. 爬虫/浏览器自动化

| 维度 | DrissionPage | Playwright | Selenium | requests + BS4 |
|------|-------------|-----------|---------|----------------|
| 反爬能力 | 内置指纹伪装、隐藏 webdriver | 需额外 stealth 插件 | 需 undetected-chromedriver | 无 |
| 中文友好度 | 作者中国开发者，中文文档 | 英文为主 | 英文为主 | -- |
| 性能 | 轻量，可混合 HTTP+浏览器 | WebSocket 协议，速度快 | 较慢 | 最快 |
| 适合微博 | 最佳 | 可以但需额外配置 | 笨重 | 仅适合简单页面 |

**推荐分层策略：**
- 第一层：DailyHotApi（API 调用，无需爬虫）
- 第二层：requests + BS4（轻量抓取，作为备选）
- 第三层：DrissionPage（深度内容采集、处理登录态）

### 2. 定时任务调度

| 维度 | APScheduler | Celery | cron | schedule |
|------|------------|--------|------|----------|
| 复杂度 | 低 | 高（需 RabbitMQ/Redis） | 最低 | 最低 |
| 动态调整间隔 | 支持 | 有限 | 需改文件 | 不支持 |
| 任务持久化 | 支持（SQLite） | 支持 | -- | 不支持 |
| 错误重试 | 支持 | 强大 | 无 | 无 |

**推荐 APScheduler**：每 30-60 分钟的定时任务场景，不需要 Celery 的分布式能力。

### 3. LLM 选型

| 维度 | DeepSeek V3 | 通义千问 | Claude API | OpenAI GPT-4o |
|------|------------|---------|------------|---------------|
| 输入费用/百万tokens | ¥2 | ¥2-3.35 | ¥11 | ¥18 |
| 输出费用/百万tokens | ¥8 | ¥6-13.5 | ¥44 | ¥54 |
| 中文写作 | 优秀（V3.1 专项优化） | 优秀 | 优秀但偏英文思维 | 优秀 |
| 国内访问 | 直连 | 直连 | 需代理 | 需代理 |
| 缓存折扣 | 自动缓存降 75% | 支持 | 无 | 无 |

**推荐 DeepSeek V3 为主力**：
- 性价比碾压级优势
- 兼容 OpenAI SDK（改 base_url 即可）
- 国内直连、中文写作专项优化
- 自动缓存对模板化提示词场景（选题引擎）特别友好

**费用估算**（每天 48 次 × 20 条热搜）：
- 无缓存：约 ¥850/月
- 缓存命中 50%：约 ¥500/月

### 4. 飞书多维表格

**lark-oapi（官方 Python SDK）**
- 版本：1.5.2（持续维护）
- 认证：自建应用 + tenant_access_token（SDK 自动刷新）
- 权限：需授予 `bitable:app`，应用需添加为表格协作者
- 批量写入限制：500 条/次
- 审核回流：可通过 SDK 查询特定状态的记录，或通过飞书事件订阅接收 Webhook

### 5. 项目框架

**纯脚本 + APScheduler，不需要 Web 框架**
- 核心是"定时采集 → 处理 → 写入"的单向数据流
- 飞书多维表格本身就是"前端"（审核界面）
- 引入 FastAPI/Flask 增加不必要复杂度
- 未来需要接收飞书 Webhook 时再按需添加

### 6. 部署方案

| 方案 | 月成本 | 优缺点 |
|------|--------|--------|
| 本地 Mac/PC | ¥0 | 需保持开机，不稳定 |
| 轻量云服务器 | ¥50-100 | 稳定可靠，支持 Chromium |
| Serverless 云函数 | ¥0-30 | 冷启动慢，不支持浏览器自动化 |
| GitHub Actions | ¥0 | 超时限制，不适合长时间运行 |

**推荐轻量云服务器**（腾讯云/阿里云 2C2G）：
- 支持 Chromium（DrissionPage 需要）
- 7×24 稳定运行
- supervisor 管理进程

---

## 项目目录结构

```
mr-lee-engine/
├── .env                      # 环境变量（不入库）
├── .env.example              # 环境变量模板（入库）
├── .gitignore
├── requirements.txt
├── main.py                   # 入口：初始化调度器，启动引擎
│
├── collectors/               # 热点采集模块
│   ├── __init__.py
│   ├── weibo.py              # 微博热搜采集
│   └── douyin.py             # 抖音热点采集（Phase 2）
│
├── processors/               # LLM 处理模块
│   ├── __init__.py
│   ├── filter.py             # 适配筛选（老李适配度评分）
│   └── rewriter.py           # 内容改写（金句/段子/脚本）
│
├── publishers/               # 输出模块
│   ├── __init__.py
│   └── feishu.py             # 飞书多维表格读写
│
├── llm/                      # LLM 客户端封装
│   ├── __init__.py
│   └── client.py             # DeepSeek/Qwen 统一调用接口
│
├── config/                   # 配置
│   ├── __init__.py
│   └── settings.py           # 从 .env 加载配置
│
├── docs/                     # 文档
│
└── logs/                     # 日志文件（不入库）
```

---

## 关键依赖

```
# requirements.txt
DrissionPage>=4.0
requests>=2.31
beautifulsoup4>=4.12
pandas>=2.0
apscheduler>=3.10
openai>=1.0              # DeepSeek 兼容 OpenAI SDK
lark-oapi>=1.5
python-dotenv>=1.0
loguru>=0.7
```

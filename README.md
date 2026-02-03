# 老李选题推荐系统

一个基于 AI 的智能选题推荐系统，为"老李动画"IP 自动筛选和生成热搜话题段子。

## 📖 项目简介

**老李人设**：40 岁中年打工人，清醒的无奈 + 无厘头搞笑 + 深刻社会洞察

**系统功能**：
- 🔍 自动爬取 5 大平台热搜（微博/抖音/今日头条/知乎/B站）
- 🎯 AI 评估话题适配度（高/中/低）
- ✨ 自动生成老李金句（15-30 字）
- 📝 自动生成完整段子脚本（80-120 字，3-5 句话）
- 🔄 智能复盘学习（基于用户确认的话题）
- 🎨 创意团队可在飞书表格中直接编辑提示词

## 🏗️ 系统架构

```
┌─────────────────────────────────────────┐
│        DailyHotApi (端口 6688)          │
│     爬取热搜 → 写入飞书多维表格          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│    Orchestrator (每天 6:00 AM)          │
│  ┌───────────────────────────────────┐  │
│  │ Step -1: Auto-check Prompts      │  │
│  │  - 检测飞书表格提示词是否更新      │  │
│  │  - 内容哈希对比（SHA256）         │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Step 0: Skill5 - 复盘学习         │  │
│  │  - 条件执行（有新确认才运行）      │  │
│  │  - 提取用户偏好模式               │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Step 1: Skill2 - 选题生成         │  │
│  │  - 快速筛选（高/中/低）           │  │
│  │  - 深度生成（仅高：理由+金句）     │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Step 2: Skill3 - 质量审核         │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Step 3: Skill4 - 完整脚本生成      │  │
│  │  - 3-5 句段子（80-120 字）        │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Step 4: 写入选题池                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│    用户手动更新（可选）                  │
│  - 勾选话题 → 重新生成脚本              │
└─────────────────────────────────────────┘
```

## 🚀 快速开始

### 1. 环境要求

- Node.js 18+
- 飞书企业自建应用（Bitable 权限）
- Claude API Key

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：

```bash
# 飞书配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# Claude API
ANTHROPIC_API_KEY=your_api_key

# 飞书多维表格
BITABLE_APP_TOKEN=your_bitable_token
BITABLE_TABLE_WEIBO=table_id_weibo
BITABLE_TABLE_DOUYIN=table_id_douyin
BITABLE_TABLE_TOUTIAO=table_id_toutiao
BITABLE_TABLE_ZHIHU=table_id_zhihu
BITABLE_TABLE_BILIBILI=table_id_bilibili
BITABLE_TABLE_POOL=table_id_pool
```

### 4. 运行

```bash
# 手动运行一次推荐任务
node agents/orchestrator.js

# 刷新提示词配置
node agents/reload-prompts.js

# 更新选定话题的脚本
node agents/update-selected.js
```

### 5. 定时任务

在服务器上配置 crontab：

```bash
# 每 2 小时爬取热搜
0 */2 * * * cd /home/jarvis/jarvis-gateway && node scripts/fetch-hot-to-bitable.js >> logs/fetch.log 2>&1

# 每天早上 6:00 运行推荐任务
0 6 * * * cd /home/jarvis/jarvis-gateway && node agents/orchestrator.js >> logs/orchestrator.log 2>&1
```

## 📁 项目结构

```
.
├── agents/                      # AI Agent 系统
│   ├── orchestrator.js          # 总控中枢
│   ├── config.js                # 配置文件
│   ├── reload-prompts.js        # 手动刷新提示词
│   ├── update-selected.js       # 手动更新选定话题脚本
│   ├── PROMPT_SYSTEM.md         # 提示词系统使用指南
│   ├── skills/                  # 技能模块
│   │   ├── skill2-generator.js  # 选题生成（两阶段）
│   │   ├── skill3-reviewer.js   # 质量审核
│   │   └── skill4-rewriter.js   # 完整脚本生成
│   ├── utils/                   # 工具模块
│   │   ├── bitable.js           # 飞书 Bitable 操作
│   │   ├── claude-api.js        # Claude API 封装
│   │   ├── logger.js            # 日志工具
│   │   ├── prompt-loader.js     # 提示词加载器（内容哈希对比）
│   │   └── retrospective.js     # 复盘分析
│   └── memory/                  # 记忆文件
│       ├── preferences.json     # 用户偏好
│       ├── stats.json           # 统计数据
│       └── history.json         # 历史记录
├── scripts/                     # 脚本
│   └── fetch-hot-to-bitable.js  # 热搜爬取脚本
├── docs/                        # 文档
│   └── conversations/           # 开发对话记录
│       └── project-development.jsonl
├── package.json
└── README.md
```

## 🎨 创意团队使用指南

### 修改提示词（零代码）

1. 打开飞书多维表格 **"提示词配置"**
2. 找到要修改的 Prompt（如 Skill2:快速筛选）
3. 直接编辑 **"Prompt内容"** 字段
4. 保存即可（系统会自动检测内容变化）

**系统会在下次执行时自动应用新 Prompt**

详见：[agents/PROMPT_SYSTEM.md](agents/PROMPT_SYSTEM.md)

### 手动更新话题脚本

1. 在选题池中勾选喜欢的话题（"是否采用"）
2. 告诉 Claude："更新选定话题的脚本"
3. 系统自动重新生成完整段子

## 🔑 核心特性

### 1. 内容哈希自动检测

- 创意团队只需修改 Prompt 内容，无需手动改版本号
- 系统使用 SHA256 哈希自动检测内容变化
- 每次执行前自动检查更新（Step -1）

### 2. 两阶段生成（节省 Token）

- **快速筛选**：评估所有话题适配度（高/中/低）
- **深度生成**：仅为高适配话题生成理由和金句
- **节省 50-70% API 成本**

### 3. 智能复盘学习

- 条件执行：只在有新确认时才运行
- 提取用户偏好模式（话题类型、语言风格、共鸣点）
- 偏好上下文注入下次推荐

### 4. 自动 + 手动混合模式

- 自动：每天 6:00 AM 自动生成所有高适配话题的完整脚本
- 手动：用户可随时更新选定话题的脚本
- 灵活：既省时间，又保证质量

## 📊 飞书多维表格结构

### 1. 热搜表（5 个）

- 微博热搜榜
- 抖音热榜
- 今日头条热榜
- 知乎热榜
- 哔哩哔哩热门

**字段**：排名 / 标题 / 热度 / 增长值 / 链接 / 抓取时间 / 适配度 / 推荐理由 / 老李金句

### 2. 老李选题池

**字段**：
- 来源平台
- 标题
- 热度
- 增长值
- 适配度（高/中/低）
- 推荐理由（10-20 字）
- 老李金句（15-30 字）
- **完整脚本**（80-120 字，3-5 句话）
- **预估时长**（30 秒）
- 是否采用（复选框）
- 推荐时间

### 3. 提示词配置

**字段**：Skill名称 / Prompt类型 / Prompt内容 / 版本号 / 更新时间 / 备注

## 🔧 技术栈

- **Node.js** - 运行环境
- **@larksuiteoapi/node-sdk** - 飞书 API
- **Claude API** - AI 生成
- **DailyHotApi** - 热搜爬取（端口 6688）
- **SHA256 哈希** - 内容变化检测

## 📝 开发日志

完整的开发对话记录见：[docs/conversations/project-development.jsonl](docs/conversations/project-development.jsonl)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

MIT License

## 📞 联系

- GitHub: https://github.com/chituhouse/Mr.lee
- 项目维护者：技术团队 + 创意团队

---

**老李语录**：

> "专家建议年轻人理性消费，我理性到只敢消费 9.9 包邮的东西"
>
> "多地上调最低工资，好消息，我离最低工资标准又近了一步"
>
> "45 公斤白银？我连 45 块的理财都不敢买"

🎭 **让每个热搜都变成老李的段子素材！**

# 老李选题系统 (jarvis-gateway)

## 架构

双系统架构，共用飞书多维表格作为数据中心。

### System A — 飞书机器人（交互层）
- 入口：`src/index.js` → `npm start`
- 飞书 WebSocket 长连接（`lark.WSClient`，无需公网回调）
- Claude Agent SDK（`claude-opus-4-5-20251101`）+ MCP Server 操作 Bitable
- 会话持久化：`data/sessions.json`（chatId → sessionId）
- systemd 服务：`jarvis-gateway.service`

### System B — 选题推荐引擎（自动化层）
- 入口：`agents/orchestrator.js`（crontab 每天 6:00 AM）
- 流程：Prompt 检查 → Skill5 复盘 → 遍历 5 平台（Skill2 筛选 → Skill3 审核 → Skill4 脚本生成 → 写入选题池）
- 模型：`claude-sonnet-4-5-20250929`，通过代理 API（`aicoding.api.zeroclover.io`）
- Prompt 外部化：存飞书表格（appToken: `HkTMbwNHqavfD6suRb0c8tNvn1f`），SHA256 热重载

### 数据采集
- DailyHotApi（端口 6688）：50+ 平台热搜聚合
- `scripts/fetch-hot-to-bitable.js`：crontab 每 2 小时，拉取 Top 50 + 增量对比
- systemd 服务：`dailyhot-api.service`

## 服务器

- IP：111.229.81.206，SSH 别名 `tencent`
- 用户：jarvis（项目运行）、root（系统管理）
- 项目路径：`/home/jarvis/jarvis-gateway`
- Node.js：`/home/linuxbrew/.linuxbrew/bin/node`

## 关键环境变量

两套 API 认证（见 `.env.example`）：
- System A：`ANTHROPIC_API_KEY`（官方 API）
- System B：`ANTHROPIC_AUTH_TOKEN`（代理 API）

## 文件结构

```
src/           → System A（飞书机器人）
agents/        → System B（选题推荐引擎）
  skills/      → Skill2(筛选)/Skill3(审核)/Skill4(脚本)
  utils/       → bitable/claude-api/prompt-loader/logger
  memory/      → 偏好/统计/历史
  config.js    → System B 配置中心
scripts/       → 数据采集 + 工具脚本
  archived/    → 已废弃脚本（Playwright 方案、旧版推荐）
```

## 开发部署

本地开发 → git push → 服务器 git pull → systemctl restart

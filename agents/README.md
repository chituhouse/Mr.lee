# 老李选题推荐系统 - Agent 架构

## 概览

基于轻量 Agent 框架的智能推荐系统，从 5 个平台（微博/抖音/今日头条/知乎/B站）热搜中筛选适合「老李」IP 的选题。

### 系统架构

```
AGENTS/
├── orchestrator.js        # 总控中枢（AGENTS.md 实现）
├── config.js              # 配置
├── skills/
│   ├── skill2-generator.js  # 选题生成师（两阶段）
│   └── skill3-reviewer.js   # 选题审核官
├── utils/
│   ├── claude-api.js      # Claude API 封装
│   ├── bitable.js         # Bitable 操作封装
│   └── logger.js          # 日志工具
└── memory/
    ├── preferences.json   # 用户偏好（未来扩展）
    ├── skill_stats.json   # 运行统计
    └── daily_history.json # 每日历史
```

## 核心改进

### 1. 两阶段生成（节省 Token 50-70%）

**旧方案**：50 条话题 → 一次性生成所有金句 → 浪费

**新方案**：
```
Skill2a（快速筛选）: 50条 → 只返回适配度（高/中/低）
                   ↓
              过滤出"高"的（~10条）
                   ↓
Skill2b（深度生成）: 10条 → 生成推荐理由 + 老李金句
```

### 2. 记忆层

- **skill_stats.json**：记录每次运行的 Token 消耗、审核通过率
- **daily_history.json**：最近 30 天的推荐历史
- **preferences.json**：未来可积累用户反馈

### 3. 模块化设计

每个 Skill 独立职责：
- **Skill2**：专注生成和质量
- **Skill3**：独立审核标准
- **Orchestrator**：调度和错误处理

## 使用方式

### 手动运行

```bash
# 单次推荐（处理所有平台）
cd /home/jarvis/jarvis-gateway
node agents/orchestrator.js

# 查看记忆文件
cat agents/memory/skill_stats.json
cat agents/memory/daily_history.json
```

### 定时任务

```bash
# 配置 crontab
/home/jarvis/setup-cron.sh

# 查看日志
tail -f /home/jarvis/logs/recommend.log
tail -f /home/jarvis/logs/fetch-hot.log
```

## 配置

### config.js

- `recommendation.enableQuotesFor`: 只对哪些适配度生成金句（默认：["高"]）
- `recommendation.maxRetries`: Skill3 驳回后最大重试次数
- `claude.model`: AI 模型（默认：claude-sonnet-4-20250514）

### 环境变量

通过 `.env` 文件配置：

```env
ANTHROPIC_BASE_URL=https://aicoding.api.zeroclover.io
ANTHROPIC_AUTH_TOKEN=sk-xxx
RECOMMEND_MODEL=claude-sonnet-4-20250514  # 可选
```

## 工作流程

```
每天早上 6:00 触发 orchestrator.js
    │
    ├─ 加载选题池标题（去重）
    │
    ├─ 遍历 5 个平台:
    │   │
    │   ├─ 获取最新未评分记录
    │   │
    │   ├─ Skill2a: 快速筛选（高/中/低）
    │   │
    │   ├─ Skill2b: 深度生成（仅高适配）
    │   │
    │   ├─ Skill3: 审核质量
    │   │
    │   ├─ 写回 Bitable（全部话题）
    │   │
    │   └─ 写入选题池（仅高适配 + 去重）
    │
    ├─ 更新记忆（统计/历史）
    │
    └─ 输出汇总日志
```

## Token 消耗估算

### 单个平台（50 条话题）

| 阶段 | 条数 | Input | Output | 合计 |
|------|------|-------|--------|------|
| Skill2a 筛选 | 50 | ~500 | ~500 | ~1000 |
| Skill2b 生成 | ~10 高 | ~300 | ~1200 | ~1500 |
| Skill3 审核 | ~10 高 | ~1200 | ~400 | ~1600 |
| **小计** | | | | **~4100** |

### 5 个平台/天

- 理想情况（各 10 条高适配）：4100 × 5 = **20,500 tokens**
- 最坏情况（各 20 条高适配）：~40,000 tokens

对比旧方案（单平台 ~7500 tokens × 5 = 37,500）：
- **节省约 45%**（理想情况）

## 维护

### 查看系统状态

```bash
# 查看最近运行统计
cat agents/memory/skill_stats.json | jq '.skill2'

# 查看历史
cat agents/memory/daily_history.json | jq '.[-7:]'  # 最近7天
```

### 清理

```bash
# 清理超过 30 天的历史（自动）
# orchestrator.js 会自动保留最近 30 天

# 手动清理日志
find /home/jarvis/logs -name "*.log" -mtime +30 -delete
```

## 故障排查

### 推荐未运行

检查 crontab：
```bash
crontab -l -u jarvis
```

查看日志：
```bash
tail -50 /home/jarvis/logs/recommend.log
```

### API 调用失败

检查环境变量：
```bash
cat /home/jarvis/jarvis-gateway/.env | grep ANTHROPIC
```

测试 API：
```bash
curl https://aicoding.api.zeroclover.io/v1/messages \
  -H "x-api-key: $ANTHROPIC_AUTH_TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

## 未来扩展

### Skill4: 老李化改写

深度内容创作：脚本大纲、段子扩写

### Skill5: 复盘学习

- 哪些选题被用户采纳？
- 哪些金句反响好？
- 调整 Skill2 的偏好权重

### 用户反馈闭环

在选题池添加「采用状态」字段，Skill5 定期分析，更新 `preferences.json`

---

**版本**: v2.0 (Agent 架构)
**最后更新**: 2026-02-03
**作者**: Claude & Yunchang

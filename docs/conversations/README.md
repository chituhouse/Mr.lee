# 对话记录归档

本目录包含所有与"老李选题系统"相关的 Claude Code 对话记录。

## 文件说明

### 当前会话（2024-02-04）
- `2024-02-04-current-session.jsonl` - **当前会话**
  - 系统架构诊断与修复
  - openclaw 删除
  - systemd 服务配置
  - Resume 功能调试

### 主要开发会话（2024-02-03）
- `2024-02-03-jarvis-deployment.jsonl` - **主要部署会话**（21MB）
  - 完整系统设计与实现
  - DailyHotApi 部署
  - Agent 系统架构
  - Prompt 配置系统

### 其他会话（2024-02-02）
- `2024-02-02-major-session.jsonl` - 主要会话（53MB）
- `2024-02-02-session-*.jsonl` - 相关开发会话

## 文件格式

所有 `.jsonl` 文件均为 JSON Lines 格式，每行一个 JSON 对象，包含：
- 用户消息
- Claude 响应
- 工具调用记录
- 系统消息

## 使用方法

```bash
# 查看对话记录（使用 jq 美化输出）
cat 2024-02-04-current-session.jsonl | jq .

# 搜索特定内容
grep -r "systemd" *.jsonl

# 统计消息数量
wc -l *.jsonl
```

## 文件大小

```bash
ls -lh *.jsonl
```

---

*最后更新：2024-02-04*
*项目：老李选题系统*
*用途：对话记录备份与归档*

# 对话记录归档

本目录保存所有 Claude Code 会话的 JSONL 文件，用于保留完整思考痕迹，便于后期复盘。

## 目录结构

```
conversations/
├── local/     ← 本地 Claude Code 会话
├── remote/    ← 服务器 Claude Code 会话
└── README.md
```

## 命名规范

```
YYYY-MM-DD-<描述>.jsonl
```

示例：
- `2024-02-03-jarvis-deployment.jsonl`
- `2024-02-04-architecture-refactor.jsonl`

## 存储方式

所有 `.jsonl` 文件通过 Git LFS 管理（文件较大，避免仓库膨胀）。

## 如何添加新对话

本地会话：
```bash
cp ~/.claude/projects/<project-hash>/<session-id>.jsonl \
   docs/conversations/local/$(date +%Y-%m-%d)-<描述>.jsonl
```

服务器会话：
```bash
scp tencent:/path/to/session.jsonl \
    docs/conversations/remote/$(date +%Y-%m-%d)-<描述>.jsonl
```

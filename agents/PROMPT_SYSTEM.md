# 老李选题系统 - 提示词配置指南

## 🎯 核心特性

### ✅ 已实现功能

1. **内容哈希自动检测**
   - 创意团队只需修改 Prompt 内容，无需手动改版本号
   - 系统自动计算 SHA256 哈希值检测内容变化
   - 每次执行前自动检查更新（Step -1）

2. **智能缓存机制**
   - 本地缓存 Prompt 内容（`agents/memory/prompts-cache.json`）
   - 只在检测到内容变化时才重新加载
   - 即使检查失败也能从缓存正常运行

3. **零停机更新**
   - 修改飞书表格 → 下次执行自动生效
   - 不需要重启服务或手动刷新

## 📋 配置表结构

**飞书多维表格：提示词配置**
- 表 ID: `tblTbRhXAbaTsb0k`
- App Token: `HkTMbwNHqavfD6suRb0c8tNvn1f`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| Skill名称 | 单行文本 | 如 "Skill2", "Skill4" |
| Prompt类型 | 单行文本 | 如 "快速筛选", "深度生成", "完整脚本" |
| Prompt内容 | 多行文本 | 完整的提示词内容（**创意团队主要编辑这个**） |
| 版本号 | 单行文本 | 如 "v1.0", "v1.1"（**可选，用于记录历史**） |
| 更新时间 | 日期 | 最后修改时间 |
| 备注 | 多行文本 | 修改原因、效果记录等 |

## 🔧 使用方式

### 方式 1：自动更新（推荐）

**每次运行推荐任务时自动检查**

```bash
# 6:00 AM 定时任务会自动执行
node agents/orchestrator.js
```

系统会在执行前（Step -1）自动：
1. 读取飞书表格中的 Prompt 内容
2. 计算 SHA256 哈希值
3. 对比缓存中的哈希值
4. 如果不一致，自动重新加载
5. 继续执行推荐流程

**日志示例（无更新）：**
```
[PromptCheck] 检查提示词配置是否有更新...
[PromptLoader] 无更新
[PromptCheck] ✓ 提示词无更新，使用缓存
```

**日志示例（有更新）：**
```
[PromptCheck] 检查提示词配置是否有更新...
[PromptLoader] 检测到更新: Skill2:快速筛选 (版本 v1.1)
[PromptLoader] 哈希变化: cd82e82a → 5cb908aa
[PromptCheck] ⚡ 检测到新版本，自动重新加载...
[PromptLoader] 重新加载完成: 3 个 Prompt
[PromptCheck] ✓ 提示词已更新
```

### 方式 2：手动刷新

**如果需要立即测试新 Prompt：**

```bash
# 在服务器上执行
cd /home/jarvis/jarvis-gateway/agents
node reload-prompts.js
```

输出：
```
====== 重新加载提示词配置 ======

当前缓存: 3 个 Prompt
  - Skill2:快速筛选 (v1.0)
  - Skill2:深度生成 (v1.0)
  - Skill4:完整脚本 (v1.0)

从飞书表格读取最新配置...
✓ 重新加载完成: 3 个 Prompt

====== 提示词配置已更新 ======
下次运行推荐任务时将使用新 Prompt
```

## 🎨 创意团队工作流

### 1. 修改提示词

在飞书表格中找到要修改的 Prompt：

```
Skill名称: Skill2
Prompt类型: 快速筛选
Prompt内容: [在这里直接修改内容]
版本号: v1.0 → v1.1（可选，建议改一下方便追溯）
备注: 增加了对"消费降级"话题的权重
```

**重要：只需修改 Prompt内容，系统会自动检测变化！**

### 2. 验证更新

两种方式：

**A. 等待自动执行（次日 6:00 AM）**
- 查看日志确认是否检测到更新

**B. 立即测试（可选）**
```bash
# SSH 到服务器
ssh tencent

# 切换到 jarvis 用户
su - jarvis

# 刷新 Prompt
cd jarvis-gateway/agents
node reload-prompts.js

# 测试生成效果（可选）
node -e "
const skill2 = require('./skills/skill2-generator');
const testTopic = {
  title: '专家建议年轻人理性消费',
  hot: 5000000,
  growth: 2000,
  status: '新'
};
skill2.quickRate([testTopic], '测试', '').then(r => console.log(r));
"
```

### 3. 版本管理建议

虽然版本号不影响自动更新，但建议维护：

| 版本号 | 修改内容 | 日期 | 效果 |
|--------|----------|------|------|
| v1.0 | 初始版本 | 2026-02-03 | 基准 |
| v1.1 | 增加"消费降级"权重 | 2026-02-04 | 高适配率 +15% |
| v1.2 | 优化金句生成示例 | 2026-02-05 | 笑点更准 |

## 🔍 技术原理

### 内容哈希对比

```javascript
// 1. 读取 Prompt 内容
const content = "你是「老李动画」选题生成师...";

// 2. 计算 SHA256 哈希（固定 64 字符）
const hash = crypto.createHash('sha256')
  .update(content)
  .digest('hex');
// → "cd82e82a732f07205735e887babea9b886f90c2a74c6a7b48f26af623670ef35"

// 3. 对比缓存中的哈希
if (hash !== cachedHash) {
  console.log("检测到更新");
  reload(); // 重新加载
}
```

**特点：**
- 内容改一个字符 → 哈希值完全不同
- 64 字符固定长度 → 对比速度快
- 单向不可逆 → 安全可靠

### 缓存结构

```json
{
  "Skill2:快速筛选": {
    "content": "完整提示词内容...",
    "version": "v1.0",
    "hash": "cd82e82a732f07205735e887babea9b886f90c2a...",
    "loadedAt": "2026-02-03T11:33:00.379Z"
  }
}
```

## 📊 当前配置状态

| Skill | Prompt类型 | 版本 | 用途 | 字符数 |
|-------|-----------|------|------|--------|
| Skill2 | 快速筛选 | v1.0 | 评估话题适配度（高/中/低） | ~297 |
| Skill2 | 深度生成 | v1.0 | 生成推荐理由和老李金句 | ~445 |
| Skill4 | 完整脚本 | v1.0 | 生成 3-5 句完整段子（30 秒） | ~586 |

## ⚠️ 注意事项

1. **修改后无需重启服务**
   - 系统会在下次执行时自动检测
   - 如需立即生效，手动运行 `reload-prompts.js`

2. **版本号建议修改但非必需**
   - 哈希对比不依赖版本号
   - 版本号主要用于日志和历史追溯

3. **测试新 Prompt**
   - 建议先在测试环境验证效果
   - 或者在低峰时段修改

4. **错误容错**
   - 即使飞书 API 调用失败，系统仍使用缓存正常运行
   - 日志会记录错误信息，但不中断流程

## 🔗 相关文件

- **配置加载器**: `/home/jarvis/jarvis-gateway/agents/utils/prompt-loader.js`
- **缓存文件**: `/home/jarvis/jarvis-gateway/agents/memory/prompts-cache.json`
- **手动刷新**: `/home/jarvis/jarvis-gateway/agents/reload-prompts.js`
- **编排器集成**: `/home/jarvis/jarvis-gateway/agents/orchestrator.js` (Step -1)

## 📞 问题排查

### Q1: 修改了 Prompt 但没生效？

**检查步骤：**
```bash
# 1. 查看缓存中的哈希值
cat agents/memory/prompts-cache.json | grep "hash"

# 2. 手动刷新
node agents/reload-prompts.js

# 3. 查看日志确认
tail -f logs/orchestrator.log
```

### Q2: 如何回滚到之前的版本？

在飞书表格中：
1. 复制旧版本的 Prompt内容
2. 粘贴到 Prompt内容 字段
3. 版本号改为 "v1.0-rollback"
4. 下次执行自动生效

### Q3: 缓存文件丢失怎么办？

```bash
# 系统会自动从飞书表格重新加载
node agents/reload-prompts.js
```

---

**最后更新**: 2026-02-03
**维护者**: 技术团队 + 创意团队

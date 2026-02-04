# 删除知乎和B站热榜清单

## 需要修改的文件

### 1. agents/config.js
- 删除 `tables.zhihu` 和 `tables.bilibili`
- 更新平台列表

### 2. agents/orchestrator.js
- 删除知乎和B站的平台配置

### 3. scripts/fetch-hot-to-bitable.js
- 删除知乎和B站的采集逻辑
- 更新平台配置

### 4. .env 和 .env.example
- 删除 `ZHIHU_TABLE_ID` 和 `BILIBILI_TABLE_ID`

### 5. crontab（如果有单独配置）
- 删除知乎和B站的定时任务

### 6. 飞书多维表格
- 建议：不要删除表格，改为归档（改名为"知乎热搜_已废弃"）
- 保留历史数据，以防未来需要

## 执行步骤

1. 修改代码文件
2. 提交 git
3. 服务器同步
4. 飞书表格重命名（手动）

## 影响评估

- 数据采集减少：5个平台 → 3个平台
- 成本降低：API调用减少40%
- 质量提升：聚焦相关度高的平台

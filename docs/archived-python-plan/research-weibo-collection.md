# 微博热搜采集方案调研（V1）

## 结论先行

**推荐方案：DailyHotApi 自部署 + requests 直接抓取作为备选**

理由：零成本、字段丰富、支持 50+ 平台（微博/抖音/B站/知乎等）、Vercel 一键部署、社区活跃（3.5K Star）。
未来扩展抖音时不需要另起炉灶。

---

## 全方案对比

| 方案 | 可行性 | 数据质量 | 稳定性 | 合规风险 | 成本 | 实现难度 |
|------|--------|---------|--------|---------|------|---------|
| 微博官方 API | 1/5 | 5(理论) | - | 极低 | 极高(10万+/年) | 高 |
| TianAPI（第三方） | 4/5 | 3/5 | 4/5 | 低 | 低 | 1/5 |
| ALAPI（第三方免费） | 4/5 | 3/5 | 3/5 | 低 | 免费 | 1/5 |
| 今日热榜/榜眼数据 | 4/5 | 4/5 | 4/5 | 低 | 低-中 | 1/5 |
| **DailyHotApi 自部署** | **5/5** | **4/5** | **3.5/5** | 中 | **免费** | **1/5** |
| RSSHub 自部署 | 5/5 | 4/5 | 4/5 | 中 | 免费 | 2/5 |
| 自写爬虫 (requests) | 3/5 | 5/5 | 2/5 | 较高 | 免费 | 2/5 |
| Playwright/DrissionPage | 3/5 | 5/5 | 2.5/5 | 较高 | 免费 | 3/5 |

---

## 方案详情

### 1. 微博官方开放平台 API（不推荐）

- 曾有 `2/trends` 接口，2013 年标注"即将废弃"，已不可用
- 商业数据 API（openapi.sc.weibo.com）：仅面向企业，约 17 万/年，且未必包含热搜
- **结论：个人开发者不可行**

### 2. 第三方数据服务

**TianAPI（tianapi.com）**
- 接口：`https://apis.tianapi.com/weibohot/index?key=YOUR_KEY`
- 更新频率：每 30 分钟
- 返回字段：hotword（关键词）+ hotwordnum（热度值）
- 免费额度：100 次/天
- 缺点：字段少，缺排名、标签（沸/热/新）、链接

**ALAPI（alapi.cn）**
- 接口：`https://v1.alapi.cn/api/new/wbtop`
- 免费，10 QPS
- 缺点：与 TianAPI 类似，字段有限

**今日热榜/榜眼数据（tophubdata.com）**
- 接口：`https://api.tophubdata.com/nodes/KqndgxeLl9`
- 字段更丰富，支持历史数据查询
- 需申请 Access Key

### 3. DailyHotApi 自部署（推荐）

- GitHub：https://github.com/imsyy/DailyHotApi （3.5K Star）
- 支持 50+ 热榜源：微博、抖音、B站、知乎、百度等
- 微博路由：`/weibo`
- 返回字段：id、title、desc、hot（热度值）、url、mobileUrl
- 部署：Vercel / Docker / Railway 一键部署
- 缓存：默认 60 分钟
- **关键优势：扩展抖音时只需调用 `/douyin` 路由，零额外开发**

### 4. RSSHub 自部署

- 路由：`/weibo/search/hot`
- 每分钟更新，支持全文模式
- 需配置 WEIBO_COOKIES
- 海外部署有地域限制

### 5. 自写爬虫

- 目标页面：`https://s.weibo.com/top/summary?cate=realtimehot`
- 数据最完整（排名、标签"沸/热/新"、精确热度等）
- 但反爬风险高，页面结构会变，需持续维护

---

## 推荐执行策略

**主方案：DailyHotApi 自部署（Vercel 免费）**
- 覆盖微博 + 抖音 + 未来更多平台
- JSON 格式直接可用
- 社区维护，路由失效有人修复

**备选方案：TianAPI（付费但稳定）**
- 当 DailyHotApi 因微博反爬升级暂时失效时切换
- 商业服务有 SLA 保证

**兜底方案：requests 直接抓取微博热搜页**
- 字段最完整
- 仅在上述方案都失效时启用

---

## 合规说明

- 热搜榜是公开聚合数据（关键词+热度），不涉及用户个人信息，风险相对较低
- 使用第三方 API 可转移部分合规风险
- 三个底线：不绕过反爬、不商业转售、不做平台替代品
- 安全排序：第三方商业 API > 开源社区方案 > 自建爬虫

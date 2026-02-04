/**
 * Bitable 操作封装
 */
const lark = require("@larksuiteoapi/node-sdk");
const config = require("../config");

class BitableClient {
  constructor() {
    this.client = new lark.Client({
      appId: process.env.FEISHU_APP_ID,
      appSecret: process.env.FEISHU_APP_SECRET,
      appType: lark.AppType.SelfBuild,
      domain: lark.Domain.Feishu,
    });
    this.appToken = config.bitable.appToken;
  }

  extractText(field) {
    if (!field) return "";
    if (typeof field === "string") return field;
    if (Array.isArray(field)) return field.map(s => s.text || "").join("");
    return String(field);
  }

  /**
   * 获取最新一批记录（同一轮采集，2分钟内）
   */
  async getLatestBatch(tableId, limit = 50) {
    const res = await this.client.request({
      method: "POST",
      url: `/open-apis/bitable/v1/apps/${this.appToken}/tables/${tableId}/records/search`,
      data: {
        sort: [{ field_name: "抓取时间", desc: true }],
        page_size: 200,
        field_names: ["标题", "排名", "热度", "增长值", "状态", "适配度（Claude）", "链接", "抓取时间"],
      },
    });
    
    if (res.code !== 0) throw new Error(`搜索失败: ${res.msg}`);
    
    const all = (res.data.items || []).map(r => ({
      record_id: r.record_id,
      title: this.extractText(r.fields["标题"]),
      rank: r.fields["排名"],
      hot: r.fields["热度"] || 0,
      growth: r.fields["增长值"] || 0,
      status: this.extractText(r.fields["状态"]),
      rating: this.extractText(r.fields["适配度（Claude）"]),
      link: r.fields["链接"],
      time: r.fields["抓取时间"],
    }));
    
    if (!all.length) return [];
    
    // 只保留最新一批（2分钟内）
    const latestTime = all[0].time;
    const cutoff = latestTime - 2 * 60 * 1000;
    return all.filter(r => r.time >= cutoff).slice(0, limit);
  }

  /**
   * 批量更新记录
   */
  async batchUpdate(tableId, updates) {
    if (!updates.length) return 0;
    const res = await this.client.bitable.appTableRecord.batchUpdate({
      path: { app_token: this.appToken, table_id: tableId },
      data: { records: updates },
    });
    if (res.code !== 0) throw new Error(`更新失败: ${res.msg}`);
    return updates.length;
  }

  /**
   * 获取选题池已有标题（去重用）
   */
  async getPoolTitles() {
    const res = await this.client.request({
      method: "POST",
      url: `/open-apis/bitable/v1/apps/${this.appToken}/tables/${config.bitable.poolTableId}/records/search`,
      data: { page_size: 500, field_names: ["标题", "来源平台"] },
    });
    
    const set = new Set();
    for (const item of (res.data?.items || [])) {
      const t = this.extractText(item.fields["标题"]);
      const p = this.extractText(item.fields["来源平台"]);
      set.add(p + "|" + t);
    }
    return set;
  }

  /**
   * 写入选题池
   */
  async writeToPool(records) {
    if (!records.length) return 0;
    const res = await this.client.bitable.appTableRecord.batchCreate({
      path: { app_token: this.appToken, table_id: config.bitable.poolTableId },
      data: { records },
    });
    if (res.code !== 0) throw new Error(`写入选题池失败: ${res.msg}`);
    return res.data.records.length;
  }

  /**
   * 获取已确认使用的选题（用户反馈）
   * @returns {Array} 已确认选题列表
   */
  async getConfirmedTopics() {
    const res = await this.client.request({
      method: "POST",
      url: `/open-apis/bitable/v1/apps/${this.appToken}/tables/${config.bitable.poolTableId}/records/search`,
      data: {
        filter: {
          conjunction: "and",
          conditions: [
            {
              field_name: "是否采用",
              operator: "is",
              value: [true],
            },
          ],
        },
        page_size: 500,
        field_names: ["标题", "来源平台", "适配度", "推荐理由", "老李金句", "是否采用", "推荐时间"],
      },
    });

    if (res.code !== 0) {
      throw new Error(`获取已确认选题失败: ${res.msg}`);
    }

    return (res.data?.items || []).map(item => ({
      record_id: item.record_id,
      title: this.extractText(item.fields["标题"]),
      platform: this.extractText(item.fields["来源平台"]),
      rating: this.extractText(item.fields["适配度"]),
      reason: this.extractText(item.fields["推荐理由"]),
      quote: this.extractText(item.fields["老李金句"]),
      status: item.fields["是否采用"] ? "已使用" : "未使用",
      time: item.fields["推荐时间"],
    }));
  }
}

module.exports = new BitableClient();

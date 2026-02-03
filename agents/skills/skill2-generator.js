/**
 * Skill2: 选题生成师
 * 两阶段：快速筛选 + 深度生成
 */
const claudeAPI = require("../utils/claude-api");
const logger = require("../utils/logger");
const promptLoader = require("../utils/prompt-loader");

class Skill2Generator {
  /**
   * 阶段 A：快速筛选（只判断适配度）
   */
  async quickRate(topics, platformName, preferenceContext = "") {
    logger.info(`[Skill2a] ${platformName} 快速筛选 ${topics.length} 条`);

    const topicList = topics.map((t, i) =>
      `${i+1}. ${t.title} | 热度:${t.hot} 增长:${t.growth} 状态:${t.status}`
    ).join("\n");

    const userMsg = preferenceContext
      ? `${preferenceContext}\n\n评估${platformName}热搜 ${topics.length} 条：\n\n${topicList}`
      : `评估${platformName}热搜 ${topics.length} 条：\n\n${topicList}`;

    const prompt = promptLoader.getPrompt("Skill2", "快速筛选");
    const res = await claudeAPI.call(prompt, userMsg, 4096);
    logger.info(`[Skill2a] API tokens:`, { in: res.usage.input_tokens, out: res.usage.output_tokens });

    const ratings = claudeAPI.parseJSON(res.text);

    // 合并回原数据
    const ratingMap = new Map(ratings.map(r => [r.title, r.rating]));
    return topics.map(t => ({
      ...t,
      rating: ratingMap.get(t.title) || "低", // 未匹配兜底
    }));
  }

  /**
   * 阶段 B：深度生成（仅高适配）
   */
  async generateQuotes(highTopics, platformName) {
    if (!highTopics.length) {
      logger.info(`[Skill2b] ${platformName} 无高适配话题`);
      return [];
    }

    logger.info(`[Skill2b] ${platformName} 深度生成 ${highTopics.length} 条金句`);

    const topicList = highTopics.map((t, i) =>
      `${i+1}. ${t.title} | 热度:${t.hot} 增长:${t.growth}`
    ).join("\n");

    const userMsg = `为${platformName}高适配选题生成理由和金句：\n\n${topicList}`;

    const prompt = promptLoader.getPrompt("Skill2", "深度生成");
    const res = await claudeAPI.call(prompt, userMsg, 8192);
    logger.info(`[Skill2b] API tokens:`, { in: res.usage.input_tokens, out: res.usage.output_tokens });
    
    const enriched = claudeAPI.parseJSON(res.text);
    
    // 合并回原数据
    const enrichMap = new Map(enriched.map(e => [e.title, e]));
    return highTopics.map(t => ({
      ...t,
      reason: enrichMap.get(t.title)?.reason || "未生成",
      quote: enrichMap.get(t.title)?.quote || "",
    }));
  }

  /**
   * 完整流程（两阶段）
   */
  async process(topics, platformName, preferenceContext = "") {
    // Step 1: 快速筛选（传入偏好上下文）
    const rated = await this.quickRate(topics, platformName, preferenceContext);

    // Step 2: 过滤高适配
    const high = rated.filter(t => t.rating === "高");
    const mid = rated.filter(t => t.rating === "中");
    const low = rated.filter(t => t.rating === "低");

    logger.info(`[Skill2] ${platformName} 筛选结果: 高${high.length} 中${mid.length} 低${low.length}`);

    // Step 3: 深度生成（仅高）
    const enrichedHigh = await this.generateQuotes(high, platformName);

    // Step 4: 合并结果（中/低不生成金句）
    return [
      ...enrichedHigh,
      ...mid.map(t => ({ ...t, reason: "中适配度话题", quote: "" })),
      ...low.map(t => ({ ...t, reason: "低适配度话题", quote: "" })),
    ];
  }
}

module.exports = new Skill2Generator();

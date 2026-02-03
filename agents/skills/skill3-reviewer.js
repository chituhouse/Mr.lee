/**
 * Skill3: 选题审核官
 */
const claudeAPI = require("../utils/claude-api");
const logger = require("../utils/logger");

const PROMPT_REVIEW = `你是「老李动画」选题审核官。审核高适配选题的质量。

标准：适配度合理、理由具体、金句有趣符合角色（25-45岁打工人共鸣）。

超过 70% 合格则 approved=true。

返回 JSON：
{"approved":true/false,"feedback":"评价","issues":[{"title":"标题","problem":"问题"}]}

只返回 JSON。`;

class Skill3Reviewer {
  /**
   * 审核高适配选题
   */
  async review(topics, platformName) {
    logger.info(`[Skill3] ${platformName} 审核 ${topics.length} 条高适配选题`);
    
    const userMsg = `审核${platformName}高适配选题 ${topics.length} 条：\n${JSON.stringify(
      topics.map(t => ({ title: t.title, reason: t.reason, quote: t.quote })),
      null,
      2
    )}`;
    
    const res = await claudeAPI.call(PROMPT_REVIEW, userMsg, 4096);
    logger.info(`[Skill3] API tokens:`, { in: res.usage.input_tokens, out: res.usage.output_tokens });
    
    try {
      const review = claudeAPI.parseJSON(res.text);
      
      if (review.approved) {
        logger.success(`[Skill3] ${platformName} 审核通过`);
      } else {
        logger.warn(`[Skill3] ${platformName} 驳回: ${review.feedback?.slice(0, 60)}`);
      }
      
      return review;
    } catch (e) {
      logger.warn(`[Skill3] JSON 解析失败，默认通过`, { error: e.message });
      return { approved: true, feedback: "解析失败，默认通过" };
    }
  }
}

module.exports = new Skill3Reviewer();

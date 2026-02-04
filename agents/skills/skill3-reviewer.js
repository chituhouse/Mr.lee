/**
 * Skill3: 选题审核官（双重审核机制）
 * - reviewQuotes: 审核金句（Skill2后，轻量审核）
 * - reviewScripts: 审核脚本（Skill4后，严格审核）
 */
const claudeAPI = require("../utils/claude-api");
const logger = require("../utils/logger");
const promptLoader = require("../utils/prompt-loader");

// 兜底 Prompt - 金句审核
const FALLBACK_QUOTE_PROMPT = `【角色】「老李动画」金句审核官

【老李人设】
30-40岁普通上班族，用最朴实的文字梗，说出打工人心里想说但不好意思说的大实话。

【审核标准】（超过 70% 合格则通过）
✅ 语言口语化（大白话、反问句、接地气比喻）
✅ 有文字游戏潜力（谐音梗、成语改编、字面理解）
✅ 符合打工人真实痛点（职场、生活、社交）
❌ 避免鸡汤式（"虽然苦但要微笑"）
❌ 避免文艺腔（"岁月如诗"）
❌ 避免段子手炫技（"连盐都买不起"）

【输出格式】
只返回 JSON：
{"approved":true/false,"feedback":"整体评价（50字以内）","issues":[{"title":"标题","problem":"问题（避免文艺腔/鸡汤式/不够口语化）"}]}`;

// 兜底 Prompt - 脚本审核
const FALLBACK_SCRIPT_PROMPT = `【角色】「老李动画」脚本终审官

【老李调性】
用最朴实的文字梗，说出打工人心里想说但不好意思说的大实话。

【审核标准】（必须 80% 以上合格）
✅ 有三幕式结构（铺垫 → 误导 → 反转 → 点评）
✅ 语言口语化（"这事儿吧"、"你看啊"、"说实话"）
✅ 有文字游戏（谐音/成语改编/字面理解）
✅ 有反转笑点（期待 vs 现实的落差）
✅ 结尾自嘲不丧（"我给你们个段子吧"）
❌ 避免鸡汤式收尾
❌ 避免文艺腔表达
❌ 避免段子手过度炫技
❌ 避免煽情式煽动

【输出格式】
只返回 JSON：
{"approved":true/false,"feedback":"整体评价（80字以内）","issues":[{"title":"标题","problem":"具体问题（缺乏反转/过于文艺/没有文字梗/不够口语化）"}]}`;

class Skill3Reviewer {
  /**
   * 审核金句（Skill2 之后，轻量审核）
   */
  async reviewQuotes(topics, platformName) {
    logger.info(`[Skill3-Quotes] ${platformName} 审核金句 ${topics.length} 条`);

    let prompt;
    try {
      prompt = promptLoader.getPrompt("Skill3", "金句审核");
    } catch {
      logger.warn("[Skill3-Quotes] 飞书 Prompt 未配置，使用兜底 Prompt");
      prompt = FALLBACK_QUOTE_PROMPT;
    }

    const userMsg = `审核${platformName}金句 ${topics.length} 条：\n${JSON.stringify(
      topics.map(t => ({ title: t.title, reason: t.reason, quote: t.quote })),
      null,
      2
    )}`;

    const res = await claudeAPI.call(prompt, userMsg, 4096);
    logger.info(`[Skill3-Quotes] API tokens:`, { in: res.usage.input_tokens, out: res.usage.output_tokens });

    try {
      const review = claudeAPI.parseJSON(res.text);

      if (review.approved) {
        logger.success(`[Skill3-Quotes] ${platformName} 金句审核通过`);
      } else {
        logger.warn(`[Skill3-Quotes] ${platformName} 驳回: ${review.feedback?.slice(0, 60)}`);
        if (review.issues && review.issues.length > 0) {
          logger.warn(`[Skill3-Quotes] 问题选题:`, review.issues.map(i => i.title).join(", "));
        }
      }

      return review;
    } catch (e) {
      logger.warn(`[Skill3-Quotes] JSON 解析失败，默认通过`, { error: e.message });
      return { approved: true, feedback: "解析失败，默认通过" };
    }
  }

  /**
   * 审核脚本（Skill4 之后，严格审核）
   */
  async reviewScripts(topics, platformName) {
    logger.info(`[Skill3-Scripts] ${platformName} 审核脚本 ${topics.length} 条`);

    let prompt;
    try {
      prompt = promptLoader.getPrompt("Skill3", "脚本审核");
    } catch {
      logger.warn("[Skill3-Scripts] 飞书 Prompt 未配置，使用兜底 Prompt");
      prompt = FALLBACK_SCRIPT_PROMPT;
    }

    const userMsg = `审核${platformName}完整脚本 ${topics.length} 条：\n${JSON.stringify(
      topics.map(t => ({
        title: t.title,
        quote: t.quote,
        fullScript: t.fullScript,
        wordplay: t.wordplay || "无",
      })),
      null,
      2
    )}`;

    const res = await claudeAPI.call(prompt, userMsg, 6144);
    logger.info(`[Skill3-Scripts] API tokens:`, { in: res.usage.input_tokens, out: res.usage.output_tokens });

    try {
      const review = claudeAPI.parseJSON(res.text);

      if (review.approved) {
        logger.success(`[Skill3-Scripts] ${platformName} 脚本审核通过`);
      } else {
        logger.warn(`[Skill3-Scripts] ${platformName} 驳回: ${review.feedback?.slice(0, 80)}`);
        if (review.issues && review.issues.length > 0) {
          review.issues.forEach(issue => {
            logger.warn(`[Skill3-Scripts] ${issue.title}: ${issue.problem}`);
          });
        }
      }

      return review;
    } catch (e) {
      logger.warn(`[Skill3-Scripts] JSON 解析失败，默认通过`, { error: e.message });
      return { approved: true, feedback: "解析失败，默认通过" };
    }
  }

  /**
   * @deprecated 保留向后兼容，未来移除
   */
  async review(topics, platformName) {
    logger.warn("[Skill3] review() 方法已废弃，请使用 reviewQuotes() 或 reviewScripts()");
    return this.reviewQuotes(topics, platformName);
  }
}

module.exports = new Skill3Reviewer();

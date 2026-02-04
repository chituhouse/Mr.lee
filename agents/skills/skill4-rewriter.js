/**
 * Skill4: 老李化改写（增强版：文字梗挖掘 + 脚本生成）
 * 两阶段：
 * 1. 识别文字梗潜力（谐音/成语/字面理解）
 * 2. 生成完整老李段子（三幕式结构）
 */
const claudeAPI = require("../utils/claude-api");
const logger = require("../utils/logger");
const promptLoader = require("../utils/prompt-loader");

// 兜底 Prompt - 文字梗挖掘
const FALLBACK_WORDPLAY_PROMPT = `【角色】文字梗挖掘专家

【识别类型】
1. 成语改编（如"不负众望" → 真的不负/辜负众人期望）
2. 谐音梗（如"走漏风声" → 口袋漏风了）
3. 字面理解（如"胖的人" → 被打成平）

【正面案例】
- "铁杵磨成针" → 用铁杵打人（字面理解）
- "无法企及的帅" → 帅到无法企鹅/站立（谐音）
- "省钱的秘诀" → 钱都没了，还省啥钱（反转）

【输出格式】
只返回 JSON：
{"wordplay":"文字梗改编思路（20字以内）","type":"成语改编/谐音梗/字面理解/反转/无"}`;

// 兜底 Prompt - 完整脚本
const FALLBACK_SCRIPT_PROMPT = `【角色】你是「老李」本人，30-40岁打工人，用大白话吐槽生活

【语言风格】
✅ 口语化："这事儿吧"、"你看啊"、"说实话"
✅ 反问句："你知道为啥吗？"
✅ 自嘲收尾："我给你们个段子吧"
❌ 避免：鸡汤式、文艺腔、段子手炫技

【脚本结构】（3-4句话，30秒）
1. 开场铺垫（日常场景）
2. 误导期待（让人以为要往某个方向）
3. 反转揭晓（真相出乎意料）
4. 老李点评（大白话总结，略带自嘲）

【示例】
最近有人问我，怎么保持年轻？（开场）
我说，这个吧，有秘诀的……（铺垫）
别熬夜，多运动，保持好心态……（误导）
[老李：] 这样……你就没到变老的年龄！（反转）

【输出格式】
只返回 JSON：
{"fullScript":"完整脚本（3-4句话）","estimatedDuration":"预估时长（如30秒）"}`;

class Skill4Rewriter {
  /**
   * 阶段 1：识别文字梗潜力
   */
  async identifyWordplay(title) {
    logger.info(`[Skill4a] 识别文字梗: ${title}`);

    let prompt;
    try {
      prompt = promptLoader.getPrompt("Skill4", "文字梗挖掘");
    } catch {
      logger.warn("[Skill4a] 飞书 Prompt 未配置，使用兜底 Prompt");
      prompt = FALLBACK_WORDPLAY_PROMPT;
    }

    const userMsg = `标题：${title}`;

    const res = await claudeAPI.call(prompt, userMsg, 1024);
    logger.info(`[Skill4a] API tokens:`, { in: res.usage.input_tokens, out: res.usage.output_tokens });

    try {
      const result = claudeAPI.parseJSON(res.text);
      return {
        wordplay: result.wordplay || "无",
        type: result.type || "无",
      };
    } catch (e) {
      logger.warn(`[Skill4a] JSON 解析失败`, { error: e.message });
      return { wordplay: "无", type: "无" };
    }
  }

  /**
   * 阶段 2：生成完整脚本（融入文字梗）
   */
  async generateScript(topic, wordplayInfo) {
    const { title, seedQuote, hot, growth, platform, reason } = topic;

    logger.info(`[Skill4b] 生成完整脚本: ${title}`);

    let prompt;
    try {
      prompt = promptLoader.getPrompt("Skill4", "完整脚本");
    } catch {
      logger.warn("[Skill4b] 飞书 Prompt 未配置，使用兜底 Prompt");
      prompt = FALLBACK_SCRIPT_PROMPT;
    }

    const userMsg = `
标题：${title}
平台：${platform || "未知"}
热度：${hot || 0}
增长：${growth || 0}
推荐理由：${reason || "（无）"}
原始金句：${seedQuote || "（无）"}
文字梗：${wordplayInfo.wordplay}（${wordplayInfo.type}）

请生成完整的老李段子（3-4 句话，30秒）。
如果有文字梗，自然融入脚本中。
`.trim();

    const res = await claudeAPI.call(prompt, userMsg, 2048);
    logger.info(`[Skill4b] API tokens:`, { in: res.usage.input_tokens, out: res.usage.output_tokens });

    const result = claudeAPI.parseJSON(res.text);

    if (!result.fullScript) {
      logger.warn(`[Skill4b] 生成失败，使用金句兜底`);
      return {
        fullScript: seedQuote || title,
        estimatedDuration: "15秒",
      };
    }

    return result;
  }

  /**
   * 完整流程：文字梗挖掘 + 脚本生成
   */
  async generate(topic) {
    // Step 1: 识别文字梗
    const wordplayInfo = await this.identifyWordplay(topic.title);

    // Step 2: 生成脚本（融入文字梗）
    const scriptInfo = await this.generateScript(topic, wordplayInfo);

    return {
      wordplay: wordplayInfo.wordplay,
      wordplayType: wordplayInfo.type,
      fullScript: scriptInfo.fullScript,
      estimatedDuration: scriptInfo.estimatedDuration,
    };
  }

  /**
   * 批量生成（写入选题池时调用）
   * 增强版：文字梗挖掘 + 脚本生成
   */
  async batchGenerate(poolRecords) {
    if (!poolRecords || poolRecords.length === 0) {
      return [];
    }

    logger.info(`[Skill4] 批量生成 ${poolRecords.length} 个完整脚本（含文字梗挖掘）`);

    const enrichedRecords = [];

    for (const record of poolRecords) {
      try {
        const fields = record.fields;
        const topic = {
          title: fields["标题"],
          platform: fields["来源平台"],
          hot: fields["热度"],
          growth: fields["增长值"],
          seedQuote: fields["老李金句"],
          reason: fields["推荐理由"],
        };

        const result = await this.generate(topic);

        enrichedRecords.push({
          fields: {
            ...fields,
            "文字梗": result.wordplay,
            "完整脚本": result.fullScript,
            "预估时长": result.estimatedDuration,
          },
        });

        logger.info(`[Skill4] ✓ ${topic.title} | 文字梗: ${result.wordplay.slice(0, 20)}`);
      } catch (err) {
        logger.error(`[Skill4] 生成失败: ${record.fields["标题"]}`, { error: err.message });
        // 失败时保留原记录（不添加完整脚本字段）
        enrichedRecords.push(record);
      }
    }

    logger.success(`[Skill4] 批量生成完成: ${enrichedRecords.length} 条（含文字梗）`);

    return enrichedRecords;
  }
}

module.exports = new Skill4Rewriter();

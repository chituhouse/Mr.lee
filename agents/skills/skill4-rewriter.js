/**
 * Skill4: 老李化改写
 * 将选题扩展成完整的老李段子（3-5 句话，30 秒时长）
 */
const claudeAPI = require("../utils/claude-api");
const logger = require("../utils/logger");
const promptLoader = require("../utils/prompt-loader");

class Skill4Rewriter {
  /**
   * 为单个选题生成完整脚本
   */
  async generate(topic) {
    const { title, seedQuote, hot, growth, platform } = topic;

    logger.info(`[Skill4] 生成完整脚本: ${title}`);

    const userMsg = `
标题：${title}
平台：${platform || "未知"}
热度：${hot || 0}
增长：${growth || 0}
原始金句：${seedQuote || "（无）"}

请生成完整的老李段子（3-5 句话）。
`.trim();

    const prompt = promptLoader.getPrompt("Skill4", "完整脚本");
    const res = await claudeAPI.call(prompt, userMsg, 2048);
    logger.info(`[Skill4] API tokens:`, { in: res.usage.input_tokens, out: res.usage.output_tokens });

    const result = claudeAPI.parseJSON(res.text);

    if (!result.fullScript) {
      logger.warn(`[Skill4] 生成失败，使用金句兜底`);
      return {
        fullScript: seedQuote || title,
        length: (seedQuote || title).length,
        estimatedDuration: "15秒",
      };
    }

    return result;
  }

  /**
   * 批量生成（写入选题池时调用）
   */
  async batchGenerate(poolRecords) {
    if (!poolRecords || poolRecords.length === 0) {
      return [];
    }

    logger.info(`[Skill4] 批量生成 ${poolRecords.length} 个完整脚本`);

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
        };

        const script = await this.generate(topic);

        enrichedRecords.push({
          fields: {
            ...fields,
            "完整脚本": script.fullScript,
            "预估时长": script.estimatedDuration,
          },
        });
      } catch (err) {
        logger.error(`[Skill4] 生成失败: ${record.fields["标题"]}`, { error: err.message });
        // 失败时保留原记录（不添加完整脚本字段）
        enrichedRecords.push(record);
      }
    }

    logger.success(`[Skill4] 批量生成完成: ${enrichedRecords.length} 条`);

    return enrichedRecords;
  }
}

module.exports = new Skill4Rewriter();

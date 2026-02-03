/**
 * 复盘分析模块
 * 读取用户已确认的选题，分析偏好模式，更新 memory/preferences.json
 */

const fs = require("fs");
const path = require("path");
const config = require("../config");
const logger = require("./logger");

class RetrospectiveAnalyzer {
  constructor() {
    this.preferencesPath = config.memory.preferences;
    this.preferences = this.loadPreferences();
  }

  loadPreferences() {
    try {
      if (fs.existsSync(this.preferencesPath)) {
        return JSON.parse(fs.readFileSync(this.preferencesPath, "utf8"));
      }
    } catch (err) {
      logger.error("[Retrospective] 加载偏好失败", { error: err.message });
    }
    return {
      version: "1.0",
      lastUpdate: null,
      patterns: {},
      platformStats: {},
      totalConfirmed: 0,
    };
  }

  savePreferences() {
    try {
      fs.writeFileSync(
        this.preferencesPath,
        JSON.stringify(this.preferences, null, 2),
        "utf8"
      );
    } catch (err) {
      logger.error("[Retrospective] 保存偏好失败", { error: err.message });
    }
  }

  /**
   * 检查是否有新的用户确认
   * @param {number} currentTotal - 当前已确认选题总数
   * @returns {boolean}
   */
  hasNewConfirmations(currentTotal) {
    const lastTotal = this.preferences.totalConfirmed || 0;
    const hasNew = currentTotal > lastTotal;

    if (hasNew) {
      logger.info(`[Skill5] 检测到新确认：${currentTotal - lastTotal} 条（总计 ${currentTotal}）`);
    } else {
      logger.info(`[Skill5] 无新确认，跳过复盘分析`);
    }

    return hasNew;
  }

  /**
   * 分析已确认的选题，提取偏好模式（深度版）
   * @param {Array} confirmedTopics - 已确认的选题列表
   * @returns {Object} 偏好摘要 + 策略建议
   */
  analyze(confirmedTopics) {
    if (!confirmedTopics || confirmedTopics.length === 0) {
      logger.info("[Skill5] 暂无已确认选题");
      return { summary: "暂无用户反馈数据", context: "", suggestions: [] };
    }

    logger.info(`[Skill5] 深度分析 ${confirmedTopics.length} 条已确认选题`);

    // 按平台统计
    const platformCounts = {};
    const keywordFreq = {};

    confirmedTopics.forEach((topic) => {
      const platform = topic.platform || "未知";
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;

      // 提取关键词（简单分词）
      const title = topic.title || "";
      const keywords = title
        .split(/[，、。！？\s]+/)
        .filter((w) => w.length >= 2);
      keywords.forEach((kw) => {
        keywordFreq[kw] = (keywordFreq[kw] || 0) + 1;
      });
    });

    // 更新偏好数据
    this.preferences.lastUpdate = new Date().toISOString();
    this.preferences.totalConfirmed = confirmedTopics.length;
    this.preferences.platformStats = platformCounts;

    // 提取高频关键词（出现 2 次以上）
    const topKeywords = Object.entries(keywordFreq)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([kw, count]) => `${kw}(${count})`);

    this.preferences.patterns.topKeywords = topKeywords;

    this.savePreferences();

    // 生成偏好摘要（用于传给 Skill2）
    const summary = [
      `用户已确认 ${confirmedTopics.length} 条选题`,
      `平台偏好: ${Object.entries(platformCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([p, c]) => `${p}(${c})`)
        .join(" > ")}`,
      topKeywords.length > 0
        ? `高频关键词: ${topKeywords.join(", ")}`
        : "关键词数据不足",
    ].join("\n");

    // 生成策略建议
    const suggestions = this.generateSuggestions(platformCounts, keywordFreq, confirmedTopics.length);

    const context = `
【用户偏好参考】
${summary}

【策略建议】
${suggestions.join("\n")}

请在评估时参考用户历史偏好，但不要过度依赖（新话题也可能受欢迎）。
`.trim();

    logger.info(`[Skill5] 复盘完成:\n${summary}\n策略建议: ${suggestions.length} 条`);

    return { summary, context, preferences: this.preferences, suggestions };
  }

  /**
   * 根据分析结果生成策略建议
   */
  generateSuggestions(platformCounts, keywordFreq, totalCount) {
    const suggestions = [];

    // 平台策略
    const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];
    if (topPlatform && topPlatform[1] >= totalCount * 0.4) {
      suggestions.push(`- ${topPlatform[0]}平台确认率高（${((topPlatform[1]/totalCount)*100).toFixed(0)}%），可适当提高该平台评分`);
    }

    // 关键词策略
    const topKeywords = Object.entries(keywordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .filter(([_, count]) => count >= 3);

    if (topKeywords.length > 0) {
      const kws = topKeywords.map(([k, c]) => `"${k}"`).join("、");
      suggestions.push(`- 包含 ${kws} 等关键词的选题受欢迎度高`);
    }

    // 数据量策略
    if (totalCount < 20) {
      suggestions.push(`- 样本数据较少（${totalCount}条），建议保持多样性探索`);
    }

    if (suggestions.length === 0) {
      suggestions.push("- 暂无明显偏好模式，继续收集数据");
    }

    return suggestions;
  }

  /**
   * 获取偏好上下文（用于传给 AI prompt）
   */
  getPreferenceContext() {
    if (this.preferences.totalConfirmed === 0) {
      return "";
    }

    const { platformStats, patterns } = this.preferences;
    const topPlatforms = Object.entries(platformStats || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([p, c]) => `${p}(${c}条)`)
      .join(" > ");

    const topKeywords = (patterns.topKeywords || []).slice(0, 5).join(", ");

    return `
【历史偏好】已确认${this.preferences.totalConfirmed}条选题
- 平台偏好: ${topPlatforms || "暂无数据"}
- 高频关键词: ${topKeywords || "暂无数据"}
- 建议: 参考历史偏好，但不要局限（用户兴趣可能变化）
`.trim();
  }
}

module.exports = RetrospectiveAnalyzer;

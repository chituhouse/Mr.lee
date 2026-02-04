/**
 * Orchestrator - 总控中枢 (AGENTS.md 实现)
 * 
 * 职责：
 *   - 调度 Skill1/Skill2/Skill3
 *   - 管理记忆（偏好、统计、历史）
 *   - 反馈循环
 *   - 错误处理和通知
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const config = require("./config");
const bitable = require("./utils/bitable");
const skill2 = require("./skills/skill2-generator");
const skill3 = require("./skills/skill3-reviewer");
const skill4 = require("./skills/skill4-rewriter");
const promptLoader = require("./utils/prompt-loader");
const RetrospectiveAnalyzer = require("./utils/retrospective");
const logger = require("./utils/logger");

class Orchestrator {
  constructor() {
    this.platforms = [
      { name: "微博", route: "weibo", tableId: config.bitable.tables.weibo },
      { name: "抖音", route: "douyin", tableId: config.bitable.tables.douyin },
      { name: "今日头条", route: "toutiao", tableId: config.bitable.tables.toutiao },
    ];
    this.retrospective = new RetrospectiveAnalyzer();
  }

  // ── 记忆管理 ──

  loadMemory(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  saveMemory(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  // ── Prompt 自动校验 ──

  /**
   * 检查并自动更新 Prompt 配置
   */
  async checkAndReloadPrompts() {
    logger.info("[PromptCheck] 检查提示词配置是否有更新...");

    try {
      const hasUpdate = await promptLoader.checkForUpdates();

      if (hasUpdate) {
        logger.info("[PromptCheck] ⚡ 检测到新版本，自动重新加载...");
        await promptLoader.reload();
        logger.success("[PromptCheck] ✓ 提示词已更新");
      } else {
        logger.info("[PromptCheck] ✓ 提示词无更新，使用缓存");
      }
    } catch (err) {
      logger.error("[PromptCheck] 检查失败，继续使用缓存", { error: err.message });
      // 不中断执行流程
    }
  }

  // ── 核心流程 ──

  /**
   * 每日推荐任务（早上6点运行）
   */
  async dailyRecommendation() {
    const startTime = Date.now();
    logger.info("====== 老李选题推荐系统 ======");

    try {
      // Step -1: 自动检查并更新 Prompt（新增）
      await this.checkAndReloadPrompts();

      // Step 0: Skill5 - 复盘学习（条件执行）
      const confirmedTopics = await bitable.getConfirmedTopics();
      let preferenceContext = "";

      if (this.retrospective.hasNewConfirmations(confirmedTopics.length)) {
        const analysis = this.retrospective.analyze(confirmedTopics);
        preferenceContext = analysis.context;
      } else {
        // 无新确认，读取历史偏好
        preferenceContext = this.retrospective.getPreferenceContext();
      }

      // Step 1: 加载选题池标题（去重）
      const poolTitles = await bitable.getPoolTitles();
      logger.info(`选题池已有 ${poolTitles.size} 条`);

      let totalProcessed = 0;
      let totalHigh = 0;
      let totalPoolAdded = 0;

      // Step 2: 遍历每个平台
      for (const platform of this.platforms) {
        try {
          const result = await this.processPlatform(platform, poolTitles, preferenceContext);
          totalProcessed += result.processed;
          totalHigh += result.high;
          totalPoolAdded += result.poolAdded;
        } catch (err) {
          logger.error(`[${platform.name}] 处理失败`, { error: err.message });
        }
      }

      // Step 3: 更新统计
      const stats = this.loadMemory(config.memory.stats) || {};
      stats.skill2 = stats.skill2 || {};
      stats.skill2.total_runs = (stats.skill2.total_runs || 0) + 1;
      stats.skill2.last_run = new Date().toISOString();
      this.saveMemory(config.memory.stats, stats);

      // Step 4: 记录历史
      const history = this.loadMemory(config.memory.history) || [];
      history.push({
        date: new Date().toISOString().split('T')[0],
        processed: totalProcessed,
        high: totalHigh,
        poolAdded: totalPoolAdded,
      });
      if (history.length > 30) history.shift(); // 只保留最近30天
      this.saveMemory(config.memory.history, history);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.success(`====== 推荐完成 (${elapsed}s) ======`, {
        processed: totalProcessed,
        high: totalHigh,
        poolAdded: totalPoolAdded,
      });

    } catch (err) {
      logger.error("推荐系统执行失败", { error: err.message, stack: err.stack });
      throw err;
    }
  }

  /**
   * 处理单个平台
   */
  async processPlatform(platform, poolTitles, preferenceContext = "") {
    const { name, tableId } = platform;
    logger.info(`\n[${name}] 开始处理...`);

    // Step 1: 获取最新未评分记录
    const records = await bitable.getLatestBatch(tableId);
    const unrated = records.filter(r => !r.rating);

    if (!unrated.length) {
      logger.info(`[${name}] 最新批次已全部评分，跳过`);
      return { processed: 0, high: 0, poolAdded: 0 };
    }

    logger.info(`[${name}] 最新批次 ${records.length} 条，未评分 ${unrated.length} 条`);

    // Step 2: Skill2 两阶段生成（传入偏好上下文）
    let recommendations = await skill2.process(unrated, name, preferenceContext);

    // Step 3: 过滤高/中适配
    let highMidTopics = recommendations.filter(t => t.rating === "高" || t.rating === "中");
    const lowTopics = recommendations.filter(t => t.rating === "低");

    logger.info(`[${name}] 适配度筛选: 高/中 ${highMidTopics.length} 条, 低 ${lowTopics.length} 条（低适配将跳过）`);

    // Step 3.1: Skill3 金句审核（最多2次重试）
    if (highMidTopics.length > 0) {
      const maxQuoteRetries = 2;
      let quoteAttempt = 0;
      let quoteReview = null;

      while (quoteAttempt <= maxQuoteRetries) {
        quoteReview = await skill3.reviewQuotes(highMidTopics, name);

        if (quoteReview.approved) {
          break; // 审核通过，跳出循环
        }

        quoteAttempt++;
        if (quoteAttempt <= maxQuoteRetries) {
          logger.warn(`[${name}] 金句审核未通过，重新生成（第 ${quoteAttempt}/${maxQuoteRetries} 次重试）`);
          // 重新生成金句（只针对有问题的选题）
          const issuesTitles = new Set(quoteReview.issues?.map(i => i.title) || []);
          const topicsToRegenerate = highMidTopics.filter(t => issuesTitles.has(t.title));

          if (topicsToRegenerate.length > 0) {
            logger.info(`[${name}] 重新生成 ${topicsToRegenerate.length} 条金句`);
            const regenerated = await skill2.generateQuotes(topicsToRegenerate, name);

            // 合并结果（替换重新生成的选题）
            const regeneratedMap = new Map(regenerated.map(t => [t.title, t]));
            highMidTopics = highMidTopics.map(t => regeneratedMap.get(t.title) || t);
          }
        } else {
          logger.warn(`[${name}] 金句审核达到最大重试次数，仍采用当前结果`);
        }
      }
    }

    // Step 4: 写回 Bitable（只处理高/中，低适配只写适配度）
    const updates = [];
    const poolRecords = [];
    const counts = { high: 0, mid: 0, low: 0 };

    for (const record of unrated) {
      const rec = recommendations.find(r => r.title === record.title);
      if (!rec) continue;

      // 低适配度：只写适配度，不生成其他内容
      if (rec.rating === "低") {
        updates.push({
          record_id: record.record_id,
          fields: {
            "适配度（Claude）": rec.rating,
          },
        });
        counts.low++;
        continue; // 跳过后续处理
      }

      // 高/中适配度：写完整内容
      updates.push({
        record_id: record.record_id,
        fields: {
          "适配度（Claude）": rec.rating,
          "推荐理由（Claude）": rec.reason || "",
          "老李金句（Claude）": rec.quote || "",
          // 文字梗暂时为空，Skill2目前不生成文字梗
          "文字梗（Claude）": "",
        },
      });

      if (rec.rating === "高") counts.high++;
      else if (rec.rating === "中") counts.mid++;

      // 只有高适配 + 有金句 + 不在选题池 → 写入选题池
      if (rec.rating === "高" && rec.quote && !poolTitles.has(name + "|" + record.title)) {
        const linkUrl = record.link?.link || "";
        poolRecords.push({
          fields: {
            "来源平台": name,
            "标题": record.title,
            "热度": record.hot,
            "增长值": record.growth || 0,
            "适配度": "高",
            "推荐理由": rec.reason,
            "老李金句": rec.quote,
            ...(linkUrl ? { "链接": { link: linkUrl, text: record.title } } : {}),
            "推荐时间": Date.now(),
          },
        });
        poolTitles.add(name + "|" + record.title);
      }
    }

    if (updates.length) {
      await bitable.batchUpdate(tableId, updates);
      logger.success(`[${name}] 更新 ${updates.length} 条`, counts);
    }

    let poolAdded = 0;
    if (poolRecords.length) {
      // Step 4: Skill4 - 为高适配选题生成完整脚本
      logger.info(`[${name}] 调用 Skill4 生成完整脚本...`);
      let enrichedRecords = await skill4.batchGenerate(poolRecords);

      // Step 4.1: Skill3 脚本审核（最多3次重试）
      const maxScriptRetries = 3;
      let scriptAttempt = 0;
      let scriptReview = null;

      // 提取用于审核的数据（包含脚本的高适配选题）
      const scriptsToReview = enrichedRecords
        .filter(r => r.fields["完整脚本"])
        .map(r => ({
          title: r.fields["标题"],
          quote: r.fields["老李金句"],
          fullScript: r.fields["完整脚本"],
          wordplay: r.fields["文字梗"] || "",
        }));

      while (scriptAttempt <= maxScriptRetries && scriptsToReview.length > 0) {
        scriptReview = await skill3.reviewScripts(scriptsToReview, name);

        if (scriptReview.approved) {
          break; // 审核通过，跳出循环
        }

        scriptAttempt++;
        if (scriptAttempt <= maxScriptRetries) {
          logger.warn(`[${name}] 脚本审核未通过，重新生成（第 ${scriptAttempt}/${maxScriptRetries} 次重试）`);

          // 重新生成脚本（只针对有问题的选题）
          const issuesTitles = new Set(scriptReview.issues?.map(i => i.title) || []);
          const recordsToRegenerate = enrichedRecords.filter(r => issuesTitles.has(r.fields["标题"]));

          if (recordsToRegenerate.length > 0) {
            logger.info(`[${name}] 重新生成 ${recordsToRegenerate.length} 条脚本`);
            const regeneratedRecords = await skill4.batchGenerate(recordsToRegenerate);

            // 合并结果（替换重新生成的记录）
            const regeneratedMap = new Map(regeneratedRecords.map(r => [r.fields["标题"], r]));
            enrichedRecords = enrichedRecords.map(r => regeneratedMap.get(r.fields["标题"]) || r);

            // 更新待审核列表
            scriptsToReview.length = 0;
            enrichedRecords
              .filter(r => r.fields["完整脚本"])
              .forEach(r => {
                scriptsToReview.push({
                  title: r.fields["标题"],
                  quote: r.fields["老李金句"],
                  fullScript: r.fields["完整脚本"],
                  wordplay: r.fields["文字梗"] || "",
                });
              });
          }
        } else {
          logger.warn(`[${name}] 脚本审核达到最大重试次数，仍采用当前结果`);
        }
      }

      // Step 5: 写入选题池（包含完整脚本）
      poolAdded = await bitable.writeToPool(enrichedRecords);
      logger.success(`[${name}] → 选题池 +${poolAdded} 条（含完整脚本）`);
    } else {
      logger.info(`[${name}] 选题池无新增`);
    }

    return { processed: unrated.length, high: counts.high, poolAdded };
  }
}

// ── 主入口 ──

async function main() {
  const orchestrator = new Orchestrator();
  await orchestrator.dailyRecommendation();
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(err => {
    logger.error("致命错误", { error: err.message });
    process.exit(1);
  });
}

module.exports = Orchestrator;

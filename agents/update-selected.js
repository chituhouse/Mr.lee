/**
 * 手动更新选定话题的完整脚本
 * 用户勾选"是否采用"后，对话触发重新生成
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const config = require("./config");
const bitable = require("./utils/bitable");
const skill4 = require("./skills/skill4-rewriter");
const logger = require("./utils/logger");

class SelectedTopicUpdater {
  /**
   * 更新所有选定话题的完整脚本
   */
  async updateSelected() {
    logger.info("====== 更新选定话题脚本 ======");

    try {
      // Step 1: 读取选定的话题（"是否采用" = true）
      const selectedTopics = await bitable.getConfirmedTopics();

      if (!selectedTopics || selectedTopics.length === 0) {
        logger.info("未找到选定的话题（请先勾选\"是否采用\"）");
        return { updated: 0, message: "未找到选定的话题" };
      }

      logger.info(`找到 ${selectedTopics.length} 个选定话题`);

      // Step 2: 为每个话题重新生成完整脚本
      const updates = [];

      for (const topic of selectedTopics) {
        try {
          logger.info(`[${topic.platform}] 重新生成: ${topic.title}`);

          const script = await skill4.generate({
            title: topic.title,
            platform: topic.platform,
            hot: topic.hot || 0,
            growth: topic.growth || 0,
            seedQuote: topic.quote,
          });

          updates.push({
            record_id: topic.record_id,
            fields: {
              "完整脚本": script.fullScript,
              "预估时长": script.estimatedDuration,
            },
          });

          logger.success(`✓ ${topic.title} (${script.length} 字)`);
        } catch (err) {
          logger.error(`生成失败: ${topic.title}`, { error: err.message });
        }
      }

      // Step 3: 批量更新回 Bitable
      if (updates.length > 0) {
        await bitable.batchUpdate(
          config.bitable.poolTableId,
          updates
        );
        logger.success(`====== 更新完成: ${updates.length} 条 ======`);
      }

      return {
        updated: updates.length,
        total: selectedTopics.length,
        message: `成功更新 ${updates.length}/${selectedTopics.length} 个话题的完整脚本`,
      };
    } catch (err) {
      logger.error("更新失败", { error: err.message, stack: err.stack });
      throw err;
    }
  }

  /**
   * 更新指定标题的话题
   * @param {string[]} titles - 话题标题数组
   */
  async updateByTitles(titles) {
    logger.info(`====== 更新指定话题脚本 (${titles.length} 个) ======`);

    try {
      // Step 1: 读取选题池所有记录
      const allTopics = await bitable.getConfirmedTopics();

      // Step 2: 过滤指定标题
      const targetTopics = allTopics.filter((t) =>
        titles.some((title) => t.title.includes(title) || title.includes(t.title))
      );

      if (targetTopics.length === 0) {
        logger.warn("未找到匹配的话题");
        return { updated: 0, message: "未找到匹配的话题" };
      }

      logger.info(`找到 ${targetTopics.length} 个匹配话题`);

      // Step 3: 重新生成脚本
      const updates = [];

      for (const topic of targetTopics) {
        try {
          const script = await skill4.generate({
            title: topic.title,
            platform: topic.platform,
            hot: topic.hot || 0,
            growth: topic.growth || 0,
            seedQuote: topic.quote,
          });

          updates.push({
            record_id: topic.record_id,
            fields: {
              "完整脚本": script.fullScript,
              "预估时长": script.estimatedDuration,
            },
          });

          logger.success(`✓ ${topic.title}`);
        } catch (err) {
          logger.error(`生成失败: ${topic.title}`, { error: err.message });
        }
      }

      // Step 4: 批量更新
      if (updates.length > 0) {
        await bitable.batchUpdate(
          config.bitable.poolTableId,
          updates
        );
        logger.success(`====== 更新完成: ${updates.length} 条 ======`);
      }

      return {
        updated: updates.length,
        total: targetTopics.length,
        message: `成功更新 ${updates.length}/${targetTopics.length} 个话题`,
      };
    } catch (err) {
      logger.error("更新失败", { error: err.message });
      throw err;
    }
  }
}

// ── 主入口 ──

async function main() {
  const updater = new SelectedTopicUpdater();

  // 检查命令行参数
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // 指定标题更新
    await updater.updateByTitles(args);
  } else {
    // 更新所有选定的
    await updater.updateSelected();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch((err) => {
    logger.error("致命错误", { error: err.message });
    process.exit(1);
  });
}

module.exports = SelectedTopicUpdater;

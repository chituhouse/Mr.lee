/**
 * Prompt 加载器
 * 从飞书多维表格读取提示词配置，支持缓存和刷新
 */
const lark = require("@larksuiteoapi/node-sdk");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("./logger");

class PromptLoader {
  constructor() {
    this.client = new lark.Client({
      appId: process.env.FEISHU_APP_ID,
      appSecret: process.env.FEISHU_APP_SECRET,
      appType: lark.AppType.SelfBuild,
      domain: lark.Domain.Feishu,
    });

    this.appToken = "HkTMbwNHqavfD6suRb0c8tNvn1f";
    this.tableId = "tblTbRhXAbaTsb0k"; // 提示词配置表

    this.cachePath = path.join(__dirname, "../memory/prompts-cache.json");
    this.prompts = this.loadCache();
  }

  /**
   * 从缓存加载 Prompt
   */
  loadCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        const cache = JSON.parse(fs.readFileSync(this.cachePath, "utf8"));
        logger.info(`[PromptLoader] 从缓存加载 ${Object.keys(cache).length} 个 Prompt`);
        return cache;
      }
    } catch (err) {
      logger.error("[PromptLoader] 加载缓存失败", { error: err.message });
    }
    return {};
  }

  /**
   * 保存到缓存
   */
  saveCache() {
    try {
      fs.writeFileSync(
        this.cachePath,
        JSON.stringify(this.prompts, null, 2),
        "utf8"
      );
      logger.info("[PromptLoader] 缓存已更新");
    } catch (err) {
      logger.error("[PromptLoader] 保存缓存失败", { error: err.message });
    }
  }

  extractText(field) {
    if (!field) return "";
    if (typeof field === "string") return field;
    if (Array.isArray(field)) return field.map(s => s.text || "").join("");
    return String(field);
  }

  /**
   * 从飞书表格重新加载所有 Prompt
   */
  async reload() {
    logger.info("[PromptLoader] 从飞书表格重新加载 Prompt...");

    try {
      const res = await this.client.request({
        method: "POST",
        url: `/open-apis/bitable/v1/apps/${this.appToken}/tables/${this.tableId}/records/search`,
        data: {
          page_size: 500,
          field_names: ["Skill名称", "Prompt类型", "Prompt内容", "版本号", "更新时间"],
        },
      });

      if (res.code !== 0) {
        throw new Error(`读取 Prompt 失败: ${res.msg}`);
      }

      const newPrompts = {};

      for (const item of res.data.items || []) {
        const skillName = this.extractText(item.fields["Skill名称"]);
        const promptType = this.extractText(item.fields["Prompt类型"]);
        const promptContent = this.extractText(item.fields["Prompt内容"]);
        const version = this.extractText(item.fields["版本号"]);

        const key = `${skillName}:${promptType}`;
        newPrompts[key] = {
          content: promptContent,
          version,
          hash: this.calculateHash(promptContent),
          loadedAt: new Date().toISOString(),
        };
      }

      this.prompts = newPrompts;
      this.saveCache();

      logger.info(`[PromptLoader] 重新加载完成: ${Object.keys(newPrompts).length} 个 Prompt`);
      return Object.keys(newPrompts).length;

    } catch (err) {
      logger.error("[PromptLoader] 重新加载失败", { error: err.message });
      throw err;
    }
  }

  /**
   * 计算内容的 SHA256 哈希值
   */
  calculateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 检查是否有更新（通过内容哈希对比）
   * @returns {boolean} 是否有更新
   */
  async checkForUpdates() {
    try {
      // 读取表格中的完整内容
      const res = await this.client.request({
        method: "POST",
        url: `/open-apis/bitable/v1/apps/${this.appToken}/tables/${this.tableId}/records/search`,
        data: {
          page_size: 500,
          field_names: ["Skill名称", "Prompt类型", "Prompt内容", "版本号"],
        },
      });

      if (res.code !== 0) {
        logger.error(`[PromptLoader] 检查更新失败: ${res.msg}`);
        return false;
      }

      // 对比内容哈希
      for (const item of res.data.items || []) {
        const skillName = this.extractText(item.fields["Skill名称"]);
        const promptType = this.extractText(item.fields["Prompt类型"]);
        const content = this.extractText(item.fields["Prompt内容"]);
        const version = this.extractText(item.fields["版本号"]);

        const key = `${skillName}:${promptType}`;
        const newHash = this.calculateHash(content);
        const cachedHash = this.prompts[key]?.hash;

        // 如果缓存中没有这个 Prompt，或者哈希值不一致
        if (!this.prompts[key] || cachedHash !== newHash) {
          logger.info(`[PromptLoader] 检测到更新: ${key} (版本 ${version})`);
          logger.debug(`[PromptLoader] 哈希变化: ${cachedHash?.substring(0, 8) || "无"} → ${newHash.substring(0, 8)}`);
          return true;
        }
      }

      logger.info("[PromptLoader] 无更新");
      return false;

    } catch (err) {
      logger.error("[PromptLoader] 检查更新异常", { error: err.message });
      return false;
    }
  }

  /**
   * 获取指定 Prompt
   * @param {string} skillName - Skill 名称（如 "Skill2"）
   * @param {string} promptType - Prompt 类型（如 "快速筛选"）
   * @returns {string} Prompt 内容
   */
  getPrompt(skillName, promptType) {
    const key = `${skillName}:${promptType}`;

    if (!this.prompts[key]) {
      logger.warn(`[PromptLoader] Prompt 不存在: ${key}`);
      throw new Error(`Prompt 不存在: ${key}，请检查飞书表格配置`);
    }

    return this.prompts[key].content;
  }

  /**
   * 列出所有已加载的 Prompt
   */
  listPrompts() {
    return Object.keys(this.prompts).map(key => {
      const [skillName, promptType] = key.split(":");
      return {
        key,
        skillName,
        promptType,
        version: this.prompts[key].version,
        loadedAt: this.prompts[key].loadedAt,
      };
    });
  }
}

// 单例模式
module.exports = new PromptLoader();

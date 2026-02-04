const lark = require("@larksuiteoapi/node-sdk");

const STALE_THRESHOLD_MS = 30 * 1000;

class FeishuClient {
  constructor({ session, claude, bitable }) {
    this.session = session;
    this.claude = claude;
    this.bitable = bitable;
    this.handled = new Map();

    this.client = new lark.Client({
      appId: process.env.FEISHU_APP_ID,
      appSecret: process.env.FEISHU_APP_SECRET,
      appType: lark.AppType.SelfBuild,
      domain: lark.Domain.Feishu,
    });
  }

  async start() {
    const eventDispatcher = new lark.EventDispatcher({}).register({
      "im.message.receive_v1": (data) => {
        this._handleMessage(data).catch((err) =>
          console.error("[Feishu] Unhandled error:", err.message)
        );
      },
    });

    const wsClient = new lark.WSClient({
      appId: process.env.FEISHU_APP_ID,
      appSecret: process.env.FEISHU_APP_SECRET,
    });

    await wsClient.start({ eventDispatcher });
    console.log("[Feishu] WebSocket connected");
  }

  async _handleMessage(data) {
    const { message } = data;
    const messageId = message.message_id;
    const chatId = message.chat_id;
    const chatType = message.chat_type;
    const msgType = message.message_type;

    if (msgType !== "text") return;

    const createTime = parseInt(message.create_time);
    if (createTime) {
      const ageMs = Date.now() - createTime;
      if (ageMs > STALE_THRESHOLD_MS) {
        console.log(`[Feishu] Skipping stale message ${messageId} (${Math.round(ageMs / 1000)}s old)`);
        return;
      }
    }

    if (this.handled.has(messageId)) return;
    this.handled.set(messageId, Date.now());

    let text = "";
    const startTime = Date.now();

    try {
      const content = JSON.parse(message.content);
      text = content.text || "";

      if (chatType === "group") {
        const hasMention = message.mentions && message.mentions.length > 0;
        if (!hasMention) return;
        text = text.replace(/@_user_\w+/g, "").trim();
      }

      if (!text) return;

      console.log(`[Feishu] Message from ${chatId}: ${text.substring(0, 80)}`);

      // 检查是否有待发送的系统通知
      await this._checkPendingNotifications(messageId);

      await this._addReaction(messageId, "OnIt");

      const existingSessionId = this.session.get(chatId);
      const response = await this.claude.chat(text, existingSessionId);

      if (response.sessionId) {
        this.session.set(chatId, response.sessionId);
      }

      const responseTime = (Date.now() - startTime) / 1000;

      await this._reply(messageId, response.result);
      await this._addReaction(messageId, "DONE");

      // Log to Bitable (fire-and-forget)
      this.bitable.logChat({
        chatId,
        userMessage: text,
        jarvisReply: response.result,
        responseTime: Math.round(responseTime * 10) / 10,
        status: "成功",
        sessionId: response.sessionId,
      });
    } catch (err) {
      const responseTime = (Date.now() - startTime) / 1000;
      console.error(`[Feishu] Error handling message ${messageId}:`, err.message);
      await this._reply(messageId, `抱歉先生，处理时遇到了问题：${err.message}`);

      this.bitable.logChat({
        chatId,
        userMessage: text,
        jarvisReply: err.message,
        responseTime: Math.round(responseTime * 10) / 10,
        status: "失败",
        sessionId: "",
      });
    }
  }

  async _reply(messageId, text) {
    try {
      const chunks = this._splitMessage(text, 3500);
      for (const chunk of chunks) {
        await this.client.im.message.reply({
          path: { message_id: messageId },
          data: {
            content: JSON.stringify({ text: chunk }),
            msg_type: "text",
          },
        });
      }
    } catch (err) {
      console.error("[Feishu] Failed to send reply:", err.message);
    }
  }

  async _addReaction(messageId, emojiType) {
    try {
      await this.client.im.messageReaction.create({
        path: { message_id: messageId },
        data: { reaction_type: { emoji_type: emojiType } },
      });
    } catch (err) {
      console.warn("[Feishu] Reaction failed:", emojiType, err.message?.substring(0, 80));
    }
  }

  _splitMessage(text, maxLen) {
    if (text.length <= maxLen) return [text];
    const chunks = [];
    let remaining = text;
    while (remaining.length > 0) {
      let splitAt = remaining.lastIndexOf("\n", maxLen);
      if (splitAt <= 0) splitAt = maxLen;
      chunks.push(remaining.substring(0, splitAt));
      remaining = remaining.substring(splitAt).trimStart();
    }
    return chunks;
  }

  async _checkPendingNotifications(messageId) {
    const fs = require("fs");
    const path = require("path");
    const notificationPath = path.join(__dirname, "..", "data", "pending-notification.json");

    try {
      if (fs.existsSync(notificationPath)) {
        const notification = JSON.parse(fs.readFileSync(notificationPath, "utf-8"));
        if (!notification.read) {
          console.log("[Feishu] 发送系统通知:", notification.title);
          await this._reply(messageId, notification.message);
          // 标记为已读并删除通知文件
          fs.unlinkSync(notificationPath);
        }
      }
    } catch (err) {
      console.warn("[Feishu] 检查通知失败:", err.message);
    }
  }
}

module.exports = { FeishuClient };

/**
 * Claude API 封装
 */
const config = require("../config");

class ClaudeAPI {
  constructor() {
    this.baseUrl = config.claude.baseUrl + "/v1/messages";
    this.apiKey = config.claude.apiKey;
    this.model = config.claude.model;
  }

  /**
   * 调用 Claude API
   * @param {string} system - System prompt
   * @param {string} userMessage - User message
   * @param {number} maxTokens - Max output tokens
   * @returns {Promise<{text: string, usage: object, stop_reason: string}>}
   */
  async call(system, userMessage, maxTokens = 16384) {
    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    return {
      text: data.content[0].text,
      usage: data.usage || {},
      stop_reason: data.stop_reason,
    };
  }

  /**
   * 解析 JSON 响应（容错）
   */
  parseJSON(text) {
    let s = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    try { return JSON.parse(s); } catch {}
    
    const i = s.indexOf("[") >= 0 ? s.indexOf("[") : s.indexOf("{");
    if (i >= 0) s = s.slice(i);
    try { return JSON.parse(s); } catch {}
    
    // 截断恢复
    for (let pos = s.lastIndexOf("}"); pos > 0; pos = s.lastIndexOf("}", pos - 1)) {
      const suffix = s[i] === "[" ? "]" : "}";
      try { return JSON.parse(s.slice(0, pos + 1) + suffix); } catch {}
    }
    
    console.error("[parseJSON] All attempts failed. Raw text:", text.slice(0, 500));
    throw new Error("JSON parse failed");
  }
}

module.exports = new ClaudeAPI();

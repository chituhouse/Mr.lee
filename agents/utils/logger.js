/**
 * 简单日志工具
 */
class Logger {
  log(level, message, meta = {}) {
    const timestamp = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
  }

  info(message, meta) { this.log("info", message, meta); }
  warn(message, meta) { this.log("warn", message, meta); }
  error(message, meta) { this.log("error", message, meta); }
  success(message, meta) { this.log("✓", message, meta); }
}

module.exports = new Logger();

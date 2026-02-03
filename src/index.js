require('dotenv').config();
const { FeishuClient } = require('./feishu');
const { ClaudeClient } = require('./claude');
const { SessionStore } = require('./session');
const { BitableLogger } = require('./bitable');

async function main() {
  console.log('[Jarvis] Starting gateway...');

  const session = new SessionStore();
  const claude = new ClaudeClient();
  const bitable = new BitableLogger();
  const feishu = new FeishuClient({ session, claude, bitable });

  await feishu.start();
  console.log('[Jarvis] Gateway running ✓');
}

main().catch(err => {
  console.error('[Jarvis] Fatal error:', err);
  process.exit(1);
});

require('dotenv').config();
const { FeishuClient } = require('./feishu');
const { ClaudeClient } = require('./claude');
const { SessionStore } = require('./session');
const { BitableLogger } = require('./bitable');
const { TaskExecutor } = require('./task-executor');
const { Deployer } = require('./deployer');

async function main() {
  console.log('[Jarvis] Starting gateway...');

  const session = new SessionStore();
  const claude = new ClaudeClient();
  const bitable = new BitableLogger();
  const taskExecutor = new TaskExecutor();
  const deployer = new Deployer();
  const feishu = new FeishuClient({ session, claude, bitable, taskExecutor, deployer });

  await feishu.start();
  console.log('[Jarvis] Gateway running ✓');
}

main().catch(err => {
  console.error('[Jarvis] Fatal error:', err);
  process.exit(1);
});

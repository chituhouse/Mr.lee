/**
 * 重新加载提示词配置
 * 从飞书多维表格读取最新的 Prompt，更新缓存
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const promptLoader = require("./utils/prompt-loader");
const logger = require("./utils/logger");

async function main() {
  console.log("====== 重新加载提示词配置 ======\n");

  try {
    // 1. 显示当前 Prompt
    const currentPrompts = promptLoader.listPrompts();
    if (currentPrompts.length > 0) {
      console.log(`当前缓存: ${currentPrompts.length} 个 Prompt`);
      currentPrompts.forEach(p => {
        console.log(`  - ${p.key} (${p.version})`);
      });
      console.log("");
    }

    // 2. 从飞书表格重新加载
    console.log("从飞书表格读取最新配置...");
    const count = await promptLoader.reload();

    // 3. 显示新 Prompt
    console.log(`\n✓ 重新加载完成: ${count} 个 Prompt\n`);

    const newPrompts = promptLoader.listPrompts();
    newPrompts.forEach(p => {
      console.log(`  ✓ ${p.key} (${p.version})`);
    });

    console.log("\n====== 提示词配置已更新 ======");
    console.log("下次运行推荐任务时将使用新 Prompt");

  } catch (err) {
    console.error("\n❌ 重新加载失败:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = main;

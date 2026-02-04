/**
 * 删除知乎和B站热搜表
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const lark = require('@larksuiteoapi/node-sdk');

const client = new lark.Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

const APP_TOKEN = process.env.BITABLE_APP_TOKEN;

async function deleteTable(tableName, tableId) {
  console.log(`\n删除 ${tableName} 表...`);

  try {
    const res = await client.bitable.appTable.delete({
      path: {
        app_token: APP_TOKEN,
        table_id: tableId
      },
    });

    if (res.code === 0) {
      console.log(`✓ ${tableName} 表已删除`);
    } else {
      console.error(`✗ 删除失败: ${res.msg} (code: ${res.code})`);
    }
  } catch (err) {
    console.error(`✗ 删除失败: ${err.message}`);
  }
}

async function main() {
  console.log('====== 删除知乎和B站热搜表 ======');
  console.log(`时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log('⚠️  警告：此操作不可恢复！\n');

  if (!process.env.ZHIHU_TABLE_ID || !process.env.BILIBILI_TABLE_ID) {
    console.log('环境变量中未找到知乎或B站表ID，跳过删除');
    return;
  }

  await deleteTable('知乎热搜', process.env.ZHIHU_TABLE_ID);
  await deleteTable('哔哩哔哩热搜', process.env.BILIBILI_TABLE_ID);

  console.log('\n====== 删除完成 ======');
  console.log('请从 .env 中删除 ZHIHU_TABLE_ID 和 BILIBILI_TABLE_ID');
}

main().catch(err => {
  console.error('[致命错误]', err.message || err);
  process.exit(1);
});

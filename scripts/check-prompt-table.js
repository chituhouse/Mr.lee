/**
 * 检查飞书 Prompt 配置表的字段结构
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const lark = require('@larksuiteoapi/node-sdk');

const client = new lark.Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

const APP_TOKEN = 'HkTMbwNHqavfD6suRb0c8tNvn1f';
const TABLE_ID = 'tblTbRhXAbaTsb0k'; // 提示词配置表

async function main() {
  console.log('====== 检查 Prompt 配置表结构 ======\n');

  // 获取表格字段列表
  const fieldsRes = await client.bitable.appTableField.list({
    path: { app_token: APP_TOKEN, table_id: TABLE_ID },
  });

  if (fieldsRes.code !== 0) {
    console.error(`获取字段列表失败: ${fieldsRes.msg}`);
    return;
  }

  console.log('字段列表：');
  for (const field of fieldsRes.data.items || []) {
    console.log(`  - ${field.field_name} (${field.type}, ID: ${field.field_id})`);
  }

  console.log('\n获取前5条记录（不指定字段名）：');
  const recordsRes = await client.request({
    method: "POST",
    url: `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/search`,
    data: {
      page_size: 5,
    },
  });

  if (recordsRes.code !== 0) {
    console.error(`获取记录失败: ${recordsRes.msg}`);
    return;
  }

  console.log(`找到 ${recordsRes.data.items?.length || 0} 条记录`);
  if (recordsRes.data.items && recordsRes.data.items.length > 0) {
    const firstRecord = recordsRes.data.items[0];
    console.log('\n第一条记录的字段：');
    console.log(JSON.stringify(firstRecord.fields, null, 2));
  }
}

main().catch(err => {
  console.error('[致命错误]', err.message || err);
  process.exit(1);
});

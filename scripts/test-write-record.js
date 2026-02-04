/**
 * 测试写入配置指南记录
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const lark = require('@larksuiteoapi/node-sdk');

const client = new lark.Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

async function test() {
  const APP_TOKEN = process.env.BITABLE_APP_TOKEN;
  const TABLE_ID = process.env.WEIBO_TABLE_ID;

  console.log('测试写入配置指南...\n');

  const testGuide = {
    '标题': '🔧 测试配置指南',
    '适配度（AI）': '这是适配度字段的测试内容',
    '文字梗挖掘（AI）': '这是文字梗字段的测试内容',
    '老李金句（AI）': '这是老李金句字段的测试内容',
  };

  try {
    const res = await client.bitable.appTableRecord.create({
      path: { app_token: APP_TOKEN, table_id: TABLE_ID },
      data: { fields: testGuide },
    });

    if (res.code === 0) {
      console.log('✓ 记录创建成功');
      console.log('记录ID:', res.data.record.record_id);
      console.log('\n检查写入的内容:');
      Object.entries(res.data.record.fields).forEach(([key, value]) => {
        console.log(`  ${key}:`, typeof value === 'string' ? value.substring(0, 50) : value);
      });
    } else {
      console.error('✗ 创建失败:', res.msg, '(code:', res.code, ')');
    }
  } catch (err) {
    console.error('✗ 错误:', err.message);
  }
}

test();

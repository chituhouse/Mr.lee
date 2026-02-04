/**
 * 补齐三平台缺失字段（只创建API可创建的普通字段）
 * AI字段需要手动配置
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

const PLATFORMS = [
  { name: '微博', tableId: process.env.WEIBO_TABLE_ID },
  { name: '抖音', tableId: process.env.DOUYIN_TABLE_ID },
  { name: '今日头条', tableId: process.env.TOUTIAO_TABLE_ID },
];

/**
 * 添加字段
 */
async function addField(tableId, fieldConfig) {
  const res = await client.bitable.appTableField.create({
    path: { app_token: APP_TOKEN, table_id: tableId },
    data: fieldConfig,
  });

  if (res.code !== 0) {
    throw new Error(`添加字段失败: ${res.msg} (code: ${res.code})`);
  }

  return res.data.field;
}

/**
 * 补齐单个表的字段
 */
async function completePlatform(platform) {
  const { name, tableId } = platform;
  console.log(`\n[${name}] 补齐缺失字段...`);

  // Claude版字段（AB测试用）
  const claudeFields = [
    {
      field_name: '适配度（Claude）',
      type: 3, // 单选
      property: {
        options: [
          { name: '高' },
          { name: '中' },
          { name: '低' },
        ],
      },
    },
    {
      field_name: '文字梗（Claude）',
      type: 1, // 多行文本
    },
    {
      field_name: '老李金句（Claude）',
      type: 1, // 多行文本
    },
    {
      field_name: '推荐理由（Claude）',
      type: 1, // 多行文本
    },
  ];

  // 确认快照字段
  const snapshotFields = [
    {
      field_name: '确认版适配度',
      type: 3, // 单选
      property: {
        options: [
          { name: '高' },
          { name: '中' },
          { name: '低' },
        ],
      },
    },
    {
      field_name: '确认版金句',
      type: 1, // 多行文本
    },
    {
      field_name: '已确认',
      type: 7, // 复选框
    },
  ];

  const allFields = [...claudeFields, ...snapshotFields];

  for (const field of allFields) {
    try {
      await addField(tableId, field);
      console.log(`  ✓ 创建字段: ${field.field_name}`);
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('已存在')) {
        console.log(`  - 字段已存在: ${field.field_name}`);
      } else {
        console.error(`  ✗ 创建失败: ${field.field_name} - ${err.message}`);
      }
    }
  }

  console.log(`[${name}] 普通字段补齐完成 ✓`);
}

async function main() {
  console.log('====== 补齐三平台缺失字段 ======');
  console.log(`时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`);

  for (const platform of PLATFORMS) {
    await completePlatform(platform);
  }

  console.log('\n====== 补齐完成 ======');
  console.log('\n⚠️ 还需要手动操作：');
  console.log('1. 文字梗挖掘（AI）- 需要在飞书Web端手动添加AI字段');
  console.log('   - 触发条件：适配度（AI）= 高 或 中');
  console.log('   - Prompt见：docs/飞书AI字段配置清单.md');
  console.log('');
  console.log('2. 抖音和头条的"适配度"字段需要手动改成AI字段类型');
  console.log('   （或删除旧字段，重新创建适配度（AI）AI字段）');
}

main().catch(err => {
  console.error('[致命错误]', err.message || err);
  process.exit(1);
});

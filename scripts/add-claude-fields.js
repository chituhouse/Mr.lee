/**
 * 为各平台热搜表添加 Claude 版字段（用于AB测试）
 *
 * 用法：
 *   node add-claude-fields.js <platform>
 *
 * 示例：
 *   node add-claude-fields.js weibo     # 只配置微博表
 *   node add-claude-fields.js all       # 配置所有 5 张表
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
  { name: '微博', route: 'weibo', tableId: process.env.WEIBO_TABLE_ID },
  { name: '抖音', route: 'douyin', tableId: process.env.DOUYIN_TABLE_ID },
  { name: '今日头条', route: 'toutiao', tableId: process.env.TOUTIAO_TABLE_ID },
];

/**
 * 添加字段到表格
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
 * 为单个表配置 Claude 版字段
 */
async function configurePlatform(platform) {
  const { name, tableId } = platform;
  console.log(`\n[${name}] 开始添加 Claude 版字段...`);

  try {
    const fields = [
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

    for (const field of fields) {
      try {
        await addField(tableId, field);
        console.log(`  ✓ 创建字段: ${field.field_name}`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('已存在')) {
          console.log(`  - 字段已存在: ${field.field_name}`);
        } else {
          throw err;
        }
      }
    }

    console.log(`[${name}] Claude 版字段配置完成 ✓`);

  } catch (err) {
    console.error(`[${name}] ✗ 配置失败: ${err.message}`);
  }
}

// ── 主流程 ──

async function main() {
  const targetPlatform = process.argv[2];

  if (!targetPlatform || (targetPlatform !== 'all' && !PLATFORMS.find(p => p.route === targetPlatform))) {
    console.log('用法: node add-claude-fields.js <platform>');
    console.log('');
    console.log('可选平台:');
    PLATFORMS.forEach(p => console.log(`  - ${p.route.padEnd(10)} (${p.name})`));
    console.log(`  - all          (所有平台)`);
    process.exit(1);
  }

  console.log('====== 添加 Claude 版字段（AB测试） ======');
  console.log(`时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);

  const platforms = targetPlatform === 'all'
    ? PLATFORMS
    : PLATFORMS.filter(p => p.route === targetPlatform);

  for (const platform of platforms) {
    await configurePlatform(platform);
  }

  console.log('\n====== 配置完成 ======');
  console.log('Claude 版字段已添加，接下来修改 Skill2 代码让它写入这些字段');
}

main().catch(err => {
  console.error('[致命错误]', err.message || err);
  process.exit(1);
});

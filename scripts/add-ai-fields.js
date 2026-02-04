/**
 * 为各平台热搜表添加 AI 字段和确认快照字段
 *
 * 用法：
 *   node add-ai-fields.js <platform>
 *
 * 示例：
 *   node add-ai-fields.js weibo     # 只配置微博表
 *   node add-ai-fields.js all       # 配置所有 5 张表
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
  { name: '知乎', route: 'zhihu', tableId: process.env.ZHIHU_TABLE_ID },
  { name: '哔哩哔哩', route: 'bilibili', tableId: process.env.BILIBILI_TABLE_ID },
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
 * 为单个表配置字段
 */
async function configurePlatform(platform) {
  const { name, tableId } = platform;
  console.log(`\n[${name}] 开始配置字段...`);

  try {
    // 注意：飞书 API 无法直接创建 AI 字段
    // AI 字段只能在 Web 界面手动配置
    // 这个脚本只创建普通字段（确认快照用）

    const fields = [
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
      {
        field_name: '推荐到选题池',
        type: 7, // 复选框
      },
    ];

    for (const field of fields) {
      try {
        const created = await addField(tableId, field);
        console.log(`  ✓ 创建字段: ${field.field_name}`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('已存在')) {
          console.log(`  - 字段已存在: ${field.field_name}`);
        } else {
          throw err;
        }
      }
    }

    console.log(`[${name}] 普通字段配置完成 ✓`);
    console.log(`[${name}] ⚠️ AI 字段需要手动配置，请参考操作手册`);

  } catch (err) {
    console.error(`[${name}] ✗ 配置失败: ${err.message}`);
  }
}

/**
 * 在表格第一行写入配置说明
 */
async function writeConfigGuide(tableId, platformName) {
  console.log(`\n[${platformName}] 写入配置说明到第一行...`);

  const guide = {
    '标题': '⚠️ AI 字段配置说明（请勿删除本行）',
    '摘要': `
请在飞书多维表格中手动添加以下 3 个 AI 字段：

1. 适配度（AI） - AI 字段，输出类型：单选（高/中/低）
2. 文字梗挖掘（AI） - AI 字段，输出类型：多行文本
3. 老李金句（AI） - AI 字段，输出类型：多行文本，触发条件：适配度=高

详细 Prompt 配置见：docs/bitable-ai-fields-操作手册.md
    `.trim(),
  };

  try {
    await client.bitable.appTableRecord.create({
      path: { app_token: APP_TOKEN, table_id: tableId },
      data: { fields: guide },
    });
    console.log(`[${platformName}] 配置说明已写入 ✓`);
  } catch (err) {
    console.error(`[${platformName}] 写入说明失败: ${err.message}`);
  }
}

// ── 主流程 ──

async function main() {
  const targetPlatform = process.argv[2];

  if (!targetPlatform || (targetPlatform !== 'all' && !PLATFORMS.find(p => p.route === targetPlatform))) {
    console.log('用法: node add-ai-fields.js <platform>');
    console.log('');
    console.log('可选平台:');
    PLATFORMS.forEach(p => console.log(`  - ${p.route.padEnd(10)} (${p.name})`));
    console.log(`  - all          (所有平台)`);
    process.exit(1);
  }

  console.log('====== 添加 AI 字段配置 ======');
  console.log(`时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);

  const platforms = targetPlatform === 'all'
    ? PLATFORMS
    : PLATFORMS.filter(p => p.route === targetPlatform);

  for (const platform of platforms) {
    await configurePlatform(platform);
    await writeConfigGuide(platform.tableId, platform.name);
  }

  console.log('\n====== 配置完成 ======');
  console.log('下一步：');
  console.log('1. 打开飞书多维表格');
  console.log('2. 查看第一行的配置说明');
  console.log('3. 按 docs/bitable-ai-fields-操作手册.md 配置 AI 字段');
}

main().catch(err => {
  console.error('[致命错误]', err.message || err);
  process.exit(1);
});

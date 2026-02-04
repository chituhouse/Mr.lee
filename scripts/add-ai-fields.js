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
    // 先创建 3 个多行文本字段（待改成 AI 字段）
    // 然后创建 4 个普通字段（确认快照用）
    const fields = [
      {
        field_name: '适配度（AI）',
        type: 1, // 多行文本（用户后续改成AI字段）
      },
      {
        field_name: '文字梗挖掘（AI）',
        type: 1, // 多行文本（用户后续改成AI字段）
      },
      {
        field_name: '老李金句（AI）',
        type: 1, // 多行文本（用户后续改成AI字段）
      },
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

    console.log(`[${name}] 字段创建完成 ✓`);

  } catch (err) {
    console.error(`[${name}] ✗ 配置失败: ${err.message}`);
  }
}

/**
 * 在表格第一行写入配置说明
 */
async function writeConfigGuide(tableId, platformName) {
  console.log(`\n[${platformName}] 写入配置说明到第一行...`);

  // 将所有配置说明放在摘要字段，避免单字段内容过长
  const configText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 AI字段配置指南（配置完成后可删除本行）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ 字段1：适配度（AI）
【步骤】点击字段列头 → 编辑字段 → 类型改为AI字段 → 输出类型：单选(高/中/低)
【Prompt】你是老李选题助手。老李是30-40岁打工人，擅长文字游戏和反转笑话。
判断标准（满足2条→高）：✅文字梗空间 ✅反转潜力 ✅打工人共鸣 ✅接地气
排除：严肃政治、负面事件、小众专业、沉重悲剧
输入：{标题}{摘要}{热度}{状态} | 输出：高/中/低

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ 字段2：文字梗挖掘（AI）
【步骤】点击字段列头 → 编辑字段 → 类型改为AI字段 → 输出类型：多行文本
【Prompt】你是文字梗挖掘专家。识别：1.成语改编 2.谐音梗 3.字面理解
案例："铁杵磨成针"→用铁杵打人 | "省钱秘诀"→钱都没了还省啥
输入：{标题} | 输出：改编思路(20字内)或"无"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ 字段3：老李金句（AI）
【步骤】点击字段列头 → 编辑字段 → 类型改为AI字段 → 输出类型：多行文本
⚠️ 勾选"仅当字段满足条件时生成" → 条件：适配度（AI）=高
【Prompt】你是老李本人，30-40岁打工人，说大白话。
风格：✅口语化 ✅反问句 ✅自嘲收尾 | ❌鸡汤式 ❌文艺腔 ❌段子手炫技
案例："小户型，那不叫极简，那叫塞不下！" | "胖的人嘛，被打成平了！"
输入：{标题}{摘要}{文字梗挖掘（AI）} | 输出：15-30字金句

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
详细文档：docs/飞书AI字段配置清单.md
  `.trim();

  const guide = {
    '标题': '🔧 AI字段配置指南',
    '摘要': configText,
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
  console.log('1. 打开飞书多维表格 Web 端');
  console.log('2. 查看第一行，每个 AI 字段都有配置步骤和 Prompt');
  console.log('3. 按字段内的【步骤】操作，把字段类型改成 AI 字段');
  console.log('4. 复制字段内的【Prompt】到 AI 提示词框');
  console.log('5. 配置完成后删除第一行指南记录');
}

main().catch(err => {
  console.error('[致命错误]', err.message || err);
  process.exit(1);
});

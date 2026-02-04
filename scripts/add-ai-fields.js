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

  const guide = {
    '标题': '🔧 AI字段配置指南（配置完成后可删除本行）',
    '适配度（AI）': `
【步骤】
1. 点击此字段列头 → 更多 → 编辑字段
2. 字段类型改为：AI字段
3. 输出类型选择：单选
4. 添加3个可选值：高、中、低
5. 复制下方Prompt到AI提示词框

【Prompt】
你是老李选题助手。老李是30-40岁打工人，擅长文字游戏和反转笑话。

【判断标准】（满足2条以上→高适配度）
✅ 有文字梗空间（成语可改编、谐音词、可字面理解）
✅ 有反转潜力（期待vs现实的落差）
✅ 打工人共鸣（职场、生活、社交真实痛点）
✅ 话题接地气（非小众、非高端）

❌ 排除：严肃政治、负面社会事件、小众专业、过于沉重的悲剧

【输入信息】
标题：{标题}
摘要：{摘要}
热度：{热度}
状态：{状态}

【输出】
只输出一个字：高 或 中 或 低
    `.trim(),
    '文字梗挖掘（AI）': `
【步骤】
1. 点击此字段列头 → 更多 → 编辑字段
2. 字段类型改为：AI字段
3. 输出类型选择：多行文本
4. 复制下方Prompt到AI提示词框

【Prompt】
你是文字梗挖掘专家。从标题中识别文字游戏潜力。

【识别类型】
1. 成语改编（如"不负众望"→真的不负/辜负众人期望）
2. 谐音梗（如"走漏风声"→口袋漏风了）
3. 字面理解（如"胖的人"→被打成平）

【正面案例】
- "铁杵磨成针"→用铁杵打人（字面理解）
- "无法企及的帅"→帅到无法企鹅/站立（谐音）
- "省钱的秘诀"→钱都没了，还省啥钱（反转）

【输入】
标题：{标题}

【输出】
如果有文字梗潜力，输出改编思路（20字以内）
如果没有，输出：无
    `.trim(),
    '老李金句（AI）': `
【步骤】
1. 点击此字段列头 → 更多 → 编辑字段
2. 字段类型改为：AI字段
3. 输出类型选择：多行文本
4. ⚠️ 勾选"仅当字段满足条件时生成"
5. 条件设置为：适配度（AI） = 高
6. 复制下方Prompt到AI提示词框

【Prompt】
你是老李本人，30-40岁打工人，说大白话。

【语言风格】
✅ 口语化："这事儿吧"、"你看啊"、"说实话"
✅ 反问句："你知道为啥吗？"
✅ 自嘲收尾："我给你们个段子吧"
❌ 避免：鸡汤式、文艺腔、段子手炫技

【正面案例】
- 话题"省钱秘诀"→金句："钱都没了，还省啥钱？"
- 话题"极简风格"→金句："小户型，那不叫极简，那叫塞不下！"
- 话题"胖的人"→金句："胖的人嘛，被打成平了！"

【反面案例】（不要这样说）
❌ "虽然生活苦，但要保持微笑……"（鸡汤式）
❌ "岁月如诗，时光似水……"（文艺腔）
❌ "本来想做条咸鱼，没想到连盐都买不起……"（段子手炫技）

【输入信息】
标题：{标题}
摘要：{摘要}
文字梗：{文字梗挖掘（AI）}

【输出】
一句老李风格金句（15-30字），不要标点符号和解释
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

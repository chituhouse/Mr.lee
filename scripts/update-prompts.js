/**
 * 更新飞书 Prompt 配置表
 * v2.1 升级：添加双重审核 + 文字梗挖掘
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const lark = require('@larksuiteoapi/node-sdk');
const crypto = require('crypto');

const client = new lark.Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

const APP_TOKEN = 'HkTMbwNHqavfD6suRb0c8tNvn1f';
const TABLE_ID = 'tblTbRhXAbaTsb0k'; // 提示词配置表

/**
 * 计算内容的 SHA256 哈希值
 */
function calculateHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 提取文本字段
 */
function extractText(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (Array.isArray(field)) return field.map(s => s.text || "").join("");
  return String(field);
}

/**
 * 读取现有 Prompt
 */
async function getCurrentPrompts() {
  const res = await client.request({
    method: "POST",
    url: `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/search`,
    data: {
      page_size: 500,
      field_names: ["Skill名称", "Prompt类型", "Prompt内容", "版本号", "record_id"],
    },
  });

  if (res.code !== 0) {
    throw new Error(`读取 Prompt 失败: ${res.msg}`);
  }

  const prompts = new Map();
  for (const item of res.data.items || []) {
    const skillName = extractText(item.fields["Skill名称"]);
    const promptType = extractText(item.fields["Prompt类型"]);
    const key = `${skillName}:${promptType}`;

    prompts.set(key, {
      record_id: item.record_id,
      skillName,
      promptType,
      content: extractText(item.fields["Prompt内容"]),
      version: extractText(item.fields["版本号"]),
    });
  }

  return prompts;
}

/**
 * 创建新 Prompt
 */
async function createPrompt(skillName, promptType, content, version) {
  const res = await client.bitable.appTableRecord.create({
    path: { app_token: APP_TOKEN, table_id: TABLE_ID },
    data: {
      fields: {
        "Skill名称": skillName,
        "Prompt类型": promptType,
        "Prompt内容": content,
        "版本号": version,
        "更新时间": Date.now(),
      },
    },
  });

  if (res.code !== 0) {
    throw new Error(`创建 Prompt 失败: ${res.msg}`);
  }

  console.log(`  ✓ 创建: ${skillName} - ${promptType} (${version})`);
}

/**
 * 更新已有 Prompt
 */
async function updatePrompt(recordId, skillName, promptType, content, version) {
  const res = await client.bitable.appTableRecord.update({
    path: { app_token: APP_TOKEN, table_id: TABLE_ID, record_id: recordId },
    data: {
      fields: {
        "Prompt内容": content,
        "版本号": version,
        "更新时间": Date.now(),
      },
    },
  });

  if (res.code !== 0) {
    throw new Error(`更新 Prompt 失败: ${res.msg}`);
  }

  console.log(`  ✓ 更新: ${skillName} - ${promptType} (${version})`);
}

/**
 * 新增/更新 Prompt 配置
 */
const NEW_PROMPTS = [
  {
    skillName: "Skill3",
    promptType: "金句审核",
    version: "v2.1.0",
    content: `【角色】「老李动画」金句审核官

【老李人设】
30-40岁普通上班族，用最朴实的文字梗，说出打工人心里想说但不好意思说的大实话。

【审核标准】（超过 70% 合格则通过）
✅ 语言口语化（大白话、反问句、接地气比喻）
✅ 有文字游戏潜力（谐音梗、成语改编、字面理解）
✅ 符合打工人真实痛点（职场、生活、社交）
❌ 避免鸡汤式（"虽然苦但要微笑"）
❌ 避免文艺腔（"岁月如诗"）
❌ 避免段子手炫技（"连盐都买不起"）

【输出格式】
只返回 JSON：
{"approved":true/false,"feedback":"整体评价（50字以内）","issues":[{"title":"标题","problem":"问题（避免文艺腔/鸡汤式/不够口语化）"}]}`
  },
  {
    skillName: "Skill3",
    promptType: "脚本审核",
    version: "v2.1.0",
    content: `【角色】「老李动画」脚本终审官

【老李调性】
用最朴实的文字梗，说出打工人心里想说但不好意思说的大实话。

【审核标准】（必须 80% 以上合格）
✅ 有三幕式结构（铺垫 → 误导 → 反转 → 点评）
✅ 语言口语化（"这事儿吧"、"你看啊"、"说实话"）
✅ 有文字游戏（谐音/成语改编/字面理解）
✅ 有反转笑点（期待 vs 现实的落差）
✅ 结尾自嘲不丧（"我给你们个段子吧"）
❌ 避免鸡汤式收尾
❌ 避免文艺腔表达
❌ 避免段子手过度炫技
❌ 避免煽情式煽动

【输出格式】
只返回 JSON：
{"approved":true/false,"feedback":"整体评价（80字以内）","issues":[{"title":"标题","problem":"具体问题（缺乏反转/过于文艺/没有文字梗/不够口语化）"}]}`
  },
  {
    skillName: "Skill4",
    promptType: "文字梗挖掘",
    version: "v2.1.0",
    content: `【角色】文字梗挖掘专家

【识别类型】
1. 成语改编（如"不负众望" → 真的不负/辜负众人期望）
2. 谐音梗（如"走漏风声" → 口袋漏风了）
3. 字面理解（如"胖的人" → 被打成平）

【正面案例】
- "铁杵磨成针" → 用铁杵打人（字面理解）
- "无法企及的帅" → 帅到无法企鹅/站立（谐音）
- "省钱的秘诀" → 钱都没了，还省啥钱（反转）

【输出格式】
只返回 JSON：
{"wordplay":"文字梗改编思路（20字以内）","type":"成语改编/谐音梗/字面理解/反转/无"}`
  },
  {
    skillName: "Skill4",
    promptType: "完整脚本",
    version: "v2.1.0",
    content: `【角色】你是「老李」本人，30-40岁打工人，用大白话吐槽生活

【语言风格】
✅ 口语化："这事儿吧"、"你看啊"、"说实话"
✅ 反问句："你知道为啥吗？"
✅ 自嘲收尾："我给你们个段子吧"
❌ 避免：鸡汤式、文艺腔、段子手炫技

【脚本结构】（3-4句话，30秒）
1. 开场铺垫（日常场景）
2. 误导期待（让人以为要往某个方向）
3. 反转揭晓（真相出乎意料）
4. 老李点评（大白话总结，略带自嘲）

【示例】
最近有人问我，怎么保持年轻？（开场）
我说，这个吧，有秘诀的……（铺垫）
别熬夜，多运动，保持好心态……（误导）
[老李：] 这样……你就没到变老的年龄！（反转）

【输出格式】
只返回 JSON：
{"fullScript":"完整脚本（3-4句话）","estimatedDuration":"预估时长（如30秒）"}`
  },
];

async function main() {
  console.log('====== 更新飞书 Prompt 配置 ======');
  console.log(`时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`);

  // Step 1: 读取现有 Prompt
  console.log('Step 1: 读取现有配置...');
  const currentPrompts = await getCurrentPrompts();
  console.log(`  现有 ${currentPrompts.size} 个 Prompt\n`);

  // Step 2: 更新/创建 Prompt
  console.log('Step 2: 更新 Prompt...');
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const newPrompt of NEW_PROMPTS) {
    const { skillName, promptType, content, version } = newPrompt;
    const key = `${skillName}:${promptType}`;
    const existing = currentPrompts.get(key);

    if (!existing) {
      // 新建
      await createPrompt(skillName, promptType, content, version);
      created++;
    } else {
      // 检查内容是否变化（通过哈希对比）
      const oldHash = calculateHash(existing.content);
      const newHash = calculateHash(content);

      if (oldHash !== newHash) {
        await updatePrompt(existing.record_id, skillName, promptType, content, version);
        console.log(`    哈希: ${oldHash.substring(0, 8)} → ${newHash.substring(0, 8)}`);
        updated++;
      } else {
        console.log(`  - 无变化: ${skillName} - ${promptType}`);
        unchanged++;
      }
    }

    // 避免频率限制
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n====== 更新完成 ======');
  console.log(`创建: ${created} 个`);
  console.log(`更新: ${updated} 个`);
  console.log(`无变化: ${unchanged} 个`);
  console.log(`总计: ${NEW_PROMPTS.length} 个 Prompt\n`);

  console.log('✅ Prompt 配置已更新，哈希校验已计算');
  console.log('📝 下一步：在服务器运行 orchestrator.js 会自动检测并热重载');
}

main().catch(err => {
  console.error('[致命错误]', err.message || err);
  process.exit(1);
});

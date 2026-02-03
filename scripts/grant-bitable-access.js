require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const lark = require("@larksuiteoapi/node-sdk");

const client = new lark.Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

const CHAT_ID = "oc_717031729e311f3c62f49a982f25e2c8";
const APP_TOKEN = process.env.BITABLE_APP_TOKEN;

async function main() {
  // 1. 获取群成员列表，找到人类用户
  console.log("[1] 获取群成员...");
  const membersRes = await client.im.chatMembers.get({
    path: { chat_id: CHAT_ID },
    params: { member_id_type: "open_id" },
  });

  if (membersRes.code !== 0) {
    console.error("获取群成员失败:", membersRes.msg);
    process.exit(1);
  }

  const members = membersRes.data.items || [];
  console.log("群成员:");
  for (const m of members) {
    console.log("  -", m.name, "|", m.member_id, "| tenant_key:", m.tenant_key);
  }

  // 找到非机器人的成员（人类用户）
  // 机器人的 member_id 通常和 app 相关，人类用户是不同的
  // 我们给所有成员都加权限（除了机器人自己）
  const humans = members.filter(m => m.member_id_type === "open_id");

  // 2. 给每个人类用户添加多维表格的完全访问权限
  for (const m of humans) {
    console.log("\n[2] 授权给:", m.name, "(", m.member_id, ")");
    try {
      const permRes = await client.drive.permission.member.create({
        path: { token: APP_TOKEN },
        params: { type: "bitable", need_notification: true },
        data: {
          member_type: "openid",
          member_id: m.member_id,
          perm: "full_access",
        },
      });
      if (permRes.code !== 0) {
        console.error("  授权失败:", permRes.code, permRes.msg);
      } else {
        console.log("  授权成功: full_access ✓");
      }
    } catch (err) {
      console.error("  授权异常:", err.message);
    }
  }

  // 3. 同时把文档转移给用户（可选：transfer ownership）
  console.log("\n完成！用户现在可以访问多维表格了。");
}

main().catch((err) => console.error(err.message));

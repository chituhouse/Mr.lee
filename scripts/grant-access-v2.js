require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const lark = require("@larksuiteoapi/node-sdk");

const client = new lark.Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

const APP_TOKEN = process.env.BITABLE_APP_TOKEN;
const USER_OPEN_ID = "ou_7fd723c6b1dacb68e1441cf9bac2cc79";

async function main() {
  // Use raw request to add collaborator
  console.log("Adding full_access permission for user...");

  const res = await client.request({
    method: "POST",
    url: "/open-apis/drive/v1/permissions/" + APP_TOKEN + "/members",
    params: { type: "bitable", need_notification: true },
    data: {
      member_type: "openid",
      member_id: USER_OPEN_ID,
      perm: "full_access",
    },
  });

  console.log("Response:", JSON.stringify(res, null, 2));
}

main().catch((err) => console.error("Error:", err.message));

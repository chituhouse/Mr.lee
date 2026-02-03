require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const lark = require("@larksuiteoapi/node-sdk");

const client = new lark.Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

async function main() {
  const res = await client.bitable.appTableRecord.list({
    path: {
      app_token: process.env.BITABLE_APP_TOKEN,
      table_id: process.env.BITABLE_TABLE_ID,
    },
    params: { page_size: 10 },
  });

  if (res.code !== 0) {
    console.log("Error:", res.msg);
    return;
  }

  console.log("总记录数:", res.data.total);
  for (const r of res.data.items) {
    const f = r.fields;
    console.log("---");
    console.log("时间:", f["时间"]);
    console.log("群组:", f["群组"]);
    console.log("用户消息:", (f["用户消息"] || "").substring(0, 60));
    console.log("Jarvis 回复:", (f["Jarvis 回复"] || "").substring(0, 100));
    console.log("响应时间:", f["响应时间(秒)"], "秒");
    console.log("状态:", f["状态"]);
    console.log("会话ID:", f["会话ID"]);
  }
}

main().catch((err) => console.error(err.message));

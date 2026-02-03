require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const lark = require("@larksuiteoapi/node-sdk");

const client = new lark.Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

async function main() {
  // Try writing with explicit field data
  console.log("=== Writing test record ===");
  const writeRes = await client.bitable.appTableRecord.create({
    path: {
      app_token: process.env.BITABLE_APP_TOKEN,
      table_id: process.env.BITABLE_TABLE_ID,
    },
    data: {
      fields: {
        "群组": "test-chat-id-123",
        "用户消息": "测试消息",
        "Jarvis 回复": "测试回复",
        "响应时间(秒)": 5.2,
        "状态": "成功",
        "会话ID": "session-test",
        "时间": Date.now(),
      },
    },
  });

  console.log("Write response code:", writeRes.code);
  console.log("Write response msg:", writeRes.msg);
  console.log("Write response data:", JSON.stringify(writeRes.data, null, 2));

  // Now read it back
  if (writeRes.data && writeRes.data.record) {
    const recordId = writeRes.data.record.record_id;
    console.log("\n=== Reading back record", recordId, "===");
    const readRes = await client.bitable.appTableRecord.get({
      path: {
        app_token: process.env.BITABLE_APP_TOKEN,
        table_id: process.env.BITABLE_TABLE_ID,
        record_id: recordId,
      },
    });
    console.log("Read data:", JSON.stringify(readRes.data, null, 2));
  }
}

main().catch((err) => console.error(err.message));

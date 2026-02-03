require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const lark = require("@larksuiteoapi/node-sdk");

const client = new lark.Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

async function main() {
  const appToken = process.env.BITABLE_APP_TOKEN;
  const url = "https://feishu.cn/base/" + appToken;

  await client.im.message.create({
    params: { receive_id_type: "chat_id" },
    data: {
      receive_id: "oc_717031729e311f3c62f49a982f25e2c8",
      content: JSON.stringify({
        text: "先生，「Jarvis 日志」多维表格已创建完成 ✓\n\n" +
              "链接：" + url + "\n\n" +
              "表格包含以下字段：时间、群组、用户消息、Jarvis 回复、响应时间(秒)、状态、会话ID\n" +
              "每次对话都会自动记录到这里。"
      }),
      msg_type: "text",
    },
  });
  console.log("Message sent with URL:", url);
}

main().catch((err) => console.error(err.message));

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const lark = require("@larksuiteoapi/node-sdk");

const client = new lark.Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

async function main() {
  // Check field definitions
  const fieldsRes = await client.bitable.appTableField.list({
    path: {
      app_token: process.env.BITABLE_APP_TOKEN,
      table_id: process.env.BITABLE_TABLE_ID,
    },
  });
  console.log("=== Fields ===");
  for (const f of fieldsRes.data.items) {
    console.log(f.field_id, "|", f.field_name, "|", f.type);
  }

  // Check raw record data
  const res = await client.bitable.appTableRecord.list({
    path: {
      app_token: process.env.BITABLE_APP_TOKEN,
      table_id: process.env.BITABLE_TABLE_ID,
    },
    params: { page_size: 2 },
  });
  console.log("\n=== Raw Record (first) ===");
  console.log(JSON.stringify(res.data.items[0], null, 2));

  if (res.data.items.length > 1) {
    console.log("\n=== Raw Record (last) ===");
    console.log(JSON.stringify(res.data.items[res.data.items.length - 1], null, 2));
  }
}

main().catch((err) => console.error(err.message));

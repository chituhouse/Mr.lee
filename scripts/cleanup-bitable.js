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
  const tableId = process.env.BITABLE_TABLE_ID;

  // List all records
  const res = await client.bitable.appTableRecord.list({
    path: { app_token: appToken, table_id: tableId },
    params: { page_size: 100 },
  });

  const emptyIds = [];
  const validIds = [];

  for (const r of res.data.items) {
    const hasData = r.fields["用户消息"] || r.fields["群组"];
    if (hasData) {
      validIds.push(r.record_id);
    } else {
      emptyIds.push(r.record_id);
    }
  }

  console.log("Valid records:", validIds.length);
  console.log("Empty records to delete:", emptyIds.length);

  if (emptyIds.length > 0) {
    const delRes = await client.bitable.appTableRecord.batchDelete({
      path: { app_token: appToken, table_id: tableId },
      data: { records: emptyIds },
    });
    console.log("Delete result code:", delRes.code);
    console.log("Deleted", emptyIds.length, "empty records");
  }

  // Also delete the extra default fields
  const fieldsRes = await client.bitable.appTableField.list({
    path: { app_token: appToken, table_id: tableId },
  });

  const extraFields = ["单选", "日期", "附件"];
  for (const f of fieldsRes.data.items) {
    if (extraFields.includes(f.field_name)) {
      try {
        await client.bitable.appTableField.delete({
          path: { app_token: appToken, table_id: tableId, field_id: f.field_id },
        });
        console.log("Deleted field:", f.field_name);
      } catch (err) {
        console.warn("Failed to delete field", f.field_name, ":", err.message);
      }
    }
  }

  // Show remaining records
  const finalRes = await client.bitable.appTableRecord.list({
    path: { app_token: appToken, table_id: tableId },
    params: { page_size: 10 },
  });
  console.log("\n=== Remaining records:", finalRes.data.total, "===");
  for (const r of finalRes.data.items) {
    const f = r.fields;
    console.log("---");
    console.log("用户消息:", f["用户消息"]);
    console.log("Jarvis 回复:", (f["Jarvis 回复"] || "").substring(0, 60));
    console.log("状态:", f["状态"]);
  }
}

main().catch((err) => console.error(err.message));

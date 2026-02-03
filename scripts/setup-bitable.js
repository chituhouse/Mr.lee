require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const lark = require("@larksuiteoapi/node-sdk");

const client = new lark.Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

async function main() {
  // 1. 创建多维表格文档
  console.log("[Bitable] 创建多维表格...");
  const appRes = await client.bitable.app.create({
    data: { name: "Jarvis 日志" },
  });
  if (appRes.code !== 0) {
    console.error("创建失败:", appRes.msg, appRes);
    process.exit(1);
  }
  const appToken = appRes.data.app.app_token;
  console.log("[Bitable] app_token:", appToken);

  // 2. 获取默认表（创建 app 时会自带一个默认表）
  const tablesRes = await client.bitable.appTable.list({
    path: { app_token: appToken },
  });
  const defaultTable = tablesRes.data.items[0];
  const tableId = defaultTable.table_id;
  console.log("[Bitable] 默认表 table_id:", tableId);

  // 3. 重命名默认表为「对话日志」
  await client.bitable.appTable.patch({
    path: { app_token: appToken, table_id: tableId },
    data: { name: "对话日志" },
  });
  console.log("[Bitable] 表已重命名为「对话日志」");

  // 4. 获取默认字段，然后修改+添加字段
  const fieldsRes = await client.bitable.appTableField.list({
    path: { app_token: appToken, table_id: tableId },
  });
  const defaultField = fieldsRes.data.items[0];

  // 修改默认字段为「时间」
  await client.bitable.appTableField.update({
    path: {
      app_token: appToken,
      table_id: tableId,
      field_id: defaultField.field_id,
    },
    data: { field_name: "时间", type: 5 }, // 5 = 日期
  });
  console.log("[Bitable] 字段: 时间 ✓");

  // 添加其余字段
  const fields = [
    { field_name: "群组", type: 1 }, // 1 = 文本
    { field_name: "用户消息", type: 1 },
    { field_name: "Jarvis 回复", type: 1 },
    { field_name: "响应时间(秒)", type: 2 }, // 2 = 数字
    {
      field_name: "状态",
      type: 3, // 3 = 单选
      property: {
        options: [
          { name: "成功", color: 1 },
          { name: "失败", color: 7 },
        ],
      },
    },
    { field_name: "会话ID", type: 1 },
  ];

  for (const f of fields) {
    const res = await client.bitable.appTableField.create({
      path: { app_token: appToken, table_id: tableId },
      data: f,
    });
    if (res.code !== 0) {
      console.error("添加字段失败:", f.field_name, res.msg);
    } else {
      console.log("[Bitable] 字段:", f.field_name, "✓");
    }
  }

  // 5. 写入测试记录
  const testRes = await client.bitable.appTableRecord.create({
    path: { app_token: appToken, table_id: tableId },
    data: {
      fields: {
        "时间": Date.now(),
        "群组": "测试群组",
        "用户消息": "你好",
        "Jarvis 回复": "您好，先生。我是 Jarvis，很高兴为您服务。",
        "响应时间(秒)": 3.5,
        "状态": "成功",
        "会话ID": "test-session-001",
      },
    },
  });
  if (testRes.code !== 0) {
    console.error("写入测试记录失败:", testRes.msg);
  } else {
    console.log("[Bitable] 测试记录写入 ✓ (record_id:", testRes.data.record.record_id + ")");
  }

  // 6. 输出配置信息
  console.log("\n========================================");
  console.log("多维表格创建完成！请将以下配置添加到 .env:");
  console.log("BITABLE_APP_TOKEN=" + appToken);
  console.log("BITABLE_TABLE_ID=" + tableId);
  console.log("========================================");
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});

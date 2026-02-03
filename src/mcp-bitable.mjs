import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as lark from "@larksuiteoapi/node-sdk";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env from jarvis-gateway directory (quiet: suppress stdout noise)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env"), quiet: true });

const OWNER_OPEN_ID = "ou_7fd723c6b1dacb68e1441cf9bac2cc79";

// Create Lark client (loggerLevel: error to suppress stdout noise)
const client = new lark.Client({
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
  loggerLevel: lark.LoggerLevel.error,
});

/**
 * Grant full_access permission on a Bitable app to the owner.
 */
async function grantAccess(appToken) {
  return await client.request({
    method: "POST",
    url: "/open-apis/drive/v1/permissions/" + appToken + "/members",
    params: { type: "bitable", need_notification: true },
    data: {
      member_type: "openid",
      member_id: OWNER_OPEN_ID,
      perm: "full_access",
    },
  });
}

// Create MCP server
const server = new McpServer({
  name: "feishu-bitable",
  version: "1.0.0",
});

// Tool: Parse Bitable URL
server.tool(
  "bitable_parse_url",
  "Extract app_token and table_id from a Feishu Bitable URL",
  { url: z.string().describe("Feishu Bitable URL") },
  async ({ url }) => {
    try {
      // Patterns:
      // https://feishu.cn/base/XXXX
      // https://xxx.feishu.cn/base/XXXX?table=YYYY
      // https://feishu.cn/base/XXXX/table/YYYY
      const appTokenMatch = url.match(/\/base\/([A-Za-z0-9]+)/);
      const tableIdMatch =
        url.match(/[?&]table=([A-Za-z0-9]+)/) ||
        url.match(/\/table\/([A-Za-z0-9]+)/);

      if (!appTokenMatch) {
        return { content: [{ type: "text", text: "Could not extract app_token from URL. Expected format: https://feishu.cn/base/XXXX" }] };
      }

      const result = { app_token: appTokenMatch[1] };
      if (tableIdMatch) result.table_id = tableIdMatch[1];

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error parsing URL: ${err.message}` }], isError: true };
    }
  }
);

// Tool: Create Bitable app
server.tool(
  "bitable_create_app",
  "Create a new Feishu Bitable app and automatically grant the user full_access permissions",
  { name: z.string().describe("Name for the new Bitable app") },
  async ({ name }) => {
    try {
      // 1. Create the Bitable app
      const res = await client.bitable.app.create({
        data: { name },
      });
      if (res.code !== 0) {
        return { content: [{ type: "text", text: `Feishu API error: ${res.msg} (code: ${res.code})` }], isError: true };
      }

      const appToken = res.data.app.app_token;
      const url = res.data.app.url;

      // 2. Grant full_access to the owner
      await grantAccess(appToken);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ app_token: appToken, url }, null, 2),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text", text: `Error creating Bitable app: ${err.message}` }], isError: true };
    }
  }
);

// Tool: List tables
server.tool(
  "bitable_list_tables",
  "List all tables in a Feishu Bitable app",
  { app_token: z.string().describe("Bitable app token") },
  async ({ app_token }) => {
    try {
      const resp = await client.bitable.appTable.list({ path: { app_token } });
      if (resp.code !== 0) {
        return { content: [{ type: "text", text: `Feishu API error: ${resp.msg} (code: ${resp.code})` }], isError: true };
      }
      const tables = (resp.data?.items || []).map((t) => ({
        table_id: t.table_id,
        name: t.name,
        revision: t.revision,
      }));
      return { content: [{ type: "text", text: JSON.stringify(tables, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error listing tables: ${err.message}` }], isError: true };
    }
  }
);

// Tool: List fields
server.tool(
  "bitable_list_fields",
  "List all fields (columns) in a Bitable table",
  {
    app_token: z.string().describe("Bitable app token"),
    table_id: z.string().describe("Table ID"),
  },
  async ({ app_token, table_id }) => {
    try {
      const resp = await client.bitable.appTableField.list({
        path: { app_token, table_id },
      });
      if (resp.code !== 0) {
        return { content: [{ type: "text", text: `Feishu API error: ${resp.msg} (code: ${resp.code})` }], isError: true };
      }
      const fields = (resp.data?.items || []).map((f) => ({
        field_id: f.field_id,
        field_name: f.field_name,
        type: f.type,
        ui_type: f.ui_type,
      }));
      return { content: [{ type: "text", text: JSON.stringify(fields, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error listing fields: ${err.message}` }], isError: true };
    }
  }
);

// Tool: List records
server.tool(
  "bitable_list_records",
  "Read records from a Bitable table. Supports pagination and filtering.",
  {
    app_token: z.string().describe("Bitable app token"),
    table_id: z.string().describe("Table ID"),
    page_size: z.number().optional().describe("Number of records per page (default 20, max 500)"),
    page_token: z.string().optional().describe("Page token for pagination"),
    filter: z.string().optional().describe("Filter expression, e.g. CurrentValue.[field] = \"value\""),
  },
  async ({ app_token, table_id, page_size, page_token, filter }) => {
    try {
      const params = {
        path: { app_token, table_id },
        params: {},
      };
      if (page_size) params.params.page_size = page_size;
      if (page_token) params.params.page_token = page_token;
      if (filter) params.params.filter = filter;

      const resp = await client.bitable.appTableRecord.list(params);
      if (resp.code !== 0) {
        return { content: [{ type: "text", text: `Feishu API error: ${resp.msg} (code: ${resp.code})` }], isError: true };
      }

      const result = {
        total: resp.data?.total,
        has_more: resp.data?.has_more,
        page_token: resp.data?.page_token,
        records: (resp.data?.items || []).map((r) => ({
          record_id: r.record_id,
          fields: r.fields,
        })),
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error listing records: ${err.message}` }], isError: true };
    }
  }
);

// Tool: Create record
server.tool(
  "bitable_create_record",
  "Create a new record in a Bitable table",
  {
    app_token: z.string().describe("Bitable app token"),
    table_id: z.string().describe("Table ID"),
    fields: z.record(z.any()).describe("Field name-value pairs, e.g. {\"Name\": \"Alice\", \"Age\": 30}"),
  },
  async ({ app_token, table_id, fields }) => {
    try {
      const resp = await client.bitable.appTableRecord.create({
        path: { app_token, table_id },
        data: { fields },
      });
      if (resp.code !== 0) {
        return { content: [{ type: "text", text: `Feishu API error: ${resp.msg} (code: ${resp.code})` }], isError: true };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ record_id: resp.data?.record?.record_id, fields: resp.data?.record?.fields }, null, 2),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text", text: `Error creating record: ${err.message}` }], isError: true };
    }
  }
);

// Tool: Update record
server.tool(
  "bitable_update_record",
  "Update an existing record in a Bitable table",
  {
    app_token: z.string().describe("Bitable app token"),
    table_id: z.string().describe("Table ID"),
    record_id: z.string().describe("Record ID to update"),
    fields: z.record(z.any()).describe("Field name-value pairs to update"),
  },
  async ({ app_token, table_id, record_id, fields }) => {
    try {
      const resp = await client.bitable.appTableRecord.update({
        path: { app_token, table_id, record_id },
        data: { fields },
      });
      if (resp.code !== 0) {
        return { content: [{ type: "text", text: `Feishu API error: ${resp.msg} (code: ${resp.code})` }], isError: true };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ record_id: resp.data?.record?.record_id, fields: resp.data?.record?.fields }, null, 2),
        }],
      };
    } catch (err) {
      return { content: [{ type: "text", text: `Error updating record: ${err.message}` }], isError: true };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server failed to start:", err);
  process.exit(1);
});

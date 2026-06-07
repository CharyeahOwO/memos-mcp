import { createServer } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const smokeToken = "memos_pat_stdio_smoke";

function fail(message) {
  throw new Error(message);
}

async function startFakeMemos() {
  const seen = {
    authorization: undefined,
  };
  const server = createServer((req, res) => {
    seen.authorization = req.headers.authorization;
    if (req.method === "GET" && req.url?.startsWith("/api/v1/memos")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          memos: [
            {
              name: "memos/smoke-stdio",
              content: "stdio smoke memo",
              visibility: "PRIVATE",
              createTime: "2026-06-07T00:00:00Z",
            },
          ],
        })
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    fail("fake Memos server did not expose a TCP address");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    seen,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function assertDefaultTools(names) {
  for (const name of [
    "memos_create",
    "memos_index_status",
    "memos_list",
    "memos_search",
    "memos_sync_index",
    "resources_list",
    "tags_list",
  ]) {
    if (!names.includes(name)) {
      fail(`tools/list is missing ${name}`);
    }
  }
  if (names.includes("memos_update") || names.includes("memos_archive")) {
    fail("update/archive tools must stay hidden by default");
  }
}

const fakeMemos = await startFakeMemos();
const stderr = [];
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["dist/index.js"],
  env: {
    MEMOS_BASE_URL: fakeMemos.baseUrl,
    MEMOS_ACCESS_TOKEN: smokeToken,
    MEMOS_MCP_TRANSPORT: "stdio",
    MEMOS_MCP_SYNC_ON_START: "false",
    MEMOS_MCP_SYNC_INTERVAL_MINUTES: "0",
    MEMOS_MCP_EMBEDDING_PROVIDER: process.env.MEMOS_MCP_EMBEDDING_PROVIDER ?? "openai-compatible",
    MEMOS_MCP_EMBEDDING_BASE_URL:
      process.env.MEMOS_MCP_EMBEDDING_BASE_URL ?? "http://127.0.0.1:11434/v1",
    MEMOS_MCP_EMBEDDING_MODEL: process.env.MEMOS_MCP_EMBEDDING_MODEL ?? "smoke-embedding",
  },
  stderr: "pipe",
});

transport.stderr?.on("data", (chunk) => {
  stderr.push(String(chunk));
});

const client = new Client({ name: "memos-mcp-stdio-smoke", version: "0.1.0" });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  assertDefaultTools(tools.tools.map((tool) => tool.name));

  const result = await client.callTool({
    name: "memos_list",
    arguments: { pageSize: 1 },
  });
  if (result.isError) {
    fail(`stdio memos_list returned an error: ${result.content?.[0]?.text ?? ""}`);
  }

  const data = JSON.parse(result.content?.[0]?.text ?? "{}");
  if (data.memos?.[0]?.name !== "memos/smoke-stdio") {
    fail("stdio memos_list did not read from the fake Memos API");
  }
  if (fakeMemos.seen.authorization !== `Bearer ${smokeToken}`) {
    fail(`Memos API did not receive the stdio env token: ${fakeMemos.seen.authorization}`);
  }

  console.log("stdio MCP smoke test passed");
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  throw new Error(`${reason}\n${stderr.join("").trim()}`);
} finally {
  await client.close().catch(() => undefined);
  await fakeMemos.close();
}

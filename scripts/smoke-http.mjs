import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const port = process.env.MEMOS_MCP_SMOKE_PORT ?? "18080";
const timeoutMs = Number(process.env.MEMOS_MCP_SMOKE_TIMEOUT_MS ?? "10000");
const smokeToken = "memos_pat_smoke";

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
              name: "memos/smoke-http",
              content: "HTTP smoke memo",
              visibility: "PRIVATE",
              createTime: "2026-06-07T00:00:00Z",
              updateTime: "2026-06-07T01:00:00Z",
              tags: ["smoke"],
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

function toolNames(result) {
  return result.tools.map((tool) => tool.name).sort();
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

async function connectHttpClient(headers) {
  const client = new Client({ name: "memos-mcp-http-smoke", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${port}/mcp`),
    headers
      ? {
          requestInit: {
            headers: new Headers(headers),
          },
        }
      : undefined
  );
  await client.connect(transport);
  return client;
}

const fakeMemos = await startFakeMemos();
const child = spawn(process.execPath, ["dist/index.js"], {
  env: {
    ...process.env,
    MEMOS_BASE_URL: fakeMemos.baseUrl,
    MEMOS_ACCESS_TOKEN: "",
    MEMOS_MCP_TRANSPORT: "http",
    MEMOS_MCP_HOST: "127.0.0.1",
    MEMOS_MCP_PORT: port,
    MEMOS_MCP_SYNC_ON_START: "false",
    MEMOS_MCP_SYNC_INTERVAL_MINUTES: "0",
    MEMOS_MCP_EMBEDDING_PROVIDER: process.env.MEMOS_MCP_EMBEDDING_PROVIDER ?? "openai-compatible",
    MEMOS_MCP_EMBEDDING_BASE_URL:
      process.env.MEMOS_MCP_EMBEDDING_BASE_URL ?? "http://127.0.0.1:11434/v1",
    MEMOS_MCP_EMBEDDING_MODEL: process.env.MEMOS_MCP_EMBEDDING_MODEL ?? "smoke-embedding",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += String(chunk);
});

const startedAt = Date.now();
let lastError;

try {
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early with code ${child.exitCode}: ${stderr.trim()}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (response.ok) {
        const body = await response.json();
        if (body?.ok === true) {
          console.log(`HTTP smoke test passed on port ${port}`);
          process.exitCode = 0;
          break;
        }
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (process.exitCode !== 0) {
    const reason = lastError instanceof Error ? lastError.message : String(lastError ?? "timeout");
    throw new Error(`HTTP smoke test timed out: ${reason}\n${stderr.trim()}`);
  }

  const getMcp = await fetch(`http://127.0.0.1:${port}/mcp`);
  if (getMcp.status !== 405) {
    fail(`GET /mcp should return 405, got ${getMcp.status}`);
  }

  const unauthenticated = await connectHttpClient();
  try {
    const names = toolNames(await unauthenticated.listTools());
    assertDefaultTools(names);
    const result = await unauthenticated.callTool({
      name: "memos_list",
      arguments: { pageSize: 1 },
    });
    const text = result.content?.[0]?.text ?? "";
    if (result.isError !== true || !text.includes("Authorization: Bearer <Memos token>")) {
      fail(`missing Authorization did not return the expected tool error: ${text}`);
    }
  } finally {
    await unauthenticated.close();
  }

  const authenticated = await connectHttpClient({
    Authorization: `Bearer ${smokeToken}`,
  });
  try {
    const names = toolNames(await authenticated.listTools());
    assertDefaultTools(names);
    const result = await authenticated.callTool({
      name: "memos_list",
      arguments: { pageSize: 1 },
    });
    if (result.isError) {
      fail(`authenticated memos_list returned an error: ${result.content?.[0]?.text ?? ""}`);
    }
    const data = JSON.parse(result.content?.[0]?.text ?? "{}");
    if (data.memos?.[0]?.name !== "memos/smoke-http") {
      fail("authenticated memos_list did not read from the fake Memos API");
    }
    if (fakeMemos.seen.authorization !== `Bearer ${smokeToken}`) {
      fail(`Memos API did not receive the expected bearer token: ${fakeMemos.seen.authorization}`);
    }
  } finally {
    await authenticated.close();
  }

  console.log(`HTTP MCP smoke test passed on port ${port}`);
} finally {
  child.kill();
  await fakeMemos.close();
}

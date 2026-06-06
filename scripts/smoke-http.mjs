import { spawn } from "node:child_process";

const port = process.env.MEMOS_MCP_SMOKE_PORT ?? "18080";
const timeoutMs = Number(process.env.MEMOS_MCP_SMOKE_TIMEOUT_MS ?? "10000");

const child = spawn(process.execPath, ["dist/index.js"], {
  env: {
    ...process.env,
    MEMOS_BASE_URL: process.env.MEMOS_BASE_URL ?? "http://127.0.0.1:5230",
    MEMOS_MCP_TRANSPORT: "http",
    MEMOS_MCP_HOST: "127.0.0.1",
    MEMOS_MCP_PORT: port,
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
} finally {
  child.kill();
}

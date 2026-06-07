import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dockerfile = readFileSync(join(root, "Dockerfile"), "utf8");
const compose = readFileSync(join(root, "docker-compose.example.yml"), "utf8");

function expectIncludes(text, snippet, file) {
  if (!text.includes(snippet)) {
    throw new Error(`${file} is missing required Docker validation snippet: ${snippet}`);
  }
}

for (const snippet of [
  "addgroup -S -g 10001 memos-mcp",
  "adduser -S -D -H -u 10001 -G memos-mcp memos-mcp",
  "mkdir -p /data",
  "chown -R memos-mcp:memos-mcp /data",
  "USER memos-mcp",
  "HEALTHCHECK",
  'CMD ["node", "dist/index.js"]',
]) {
  expectIncludes(dockerfile, snippet, "Dockerfile");
}

for (const snippet of [
  "MEMOS_MCP_TRANSPORT: http",
  "MEMOS_MCP_HOST: 0.0.0.0",
  "MEMOS_MCP_PORT: 8080",
  "MEMOS_MCP_INDEX_DB: ${MEMOS_MCP_INDEX_DB:-/data/memos-mcp-index.json}",
  "memos-mcp-data:/data",
  "host.docker.internal:host-gateway",
  "healthcheck:",
  "memos-mcp-data:",
]) {
  expectIncludes(compose, snippet, "docker-compose.example.yml");
}

console.log("Dockerfile and Compose static validation passed");

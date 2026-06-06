import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "README.md",
  "README.zh-CN.md",
  "CONTRIBUTING.md",
  ".env.example",
  ".dockerignore",
  "Dockerfile",
  "docker-compose.example.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/docker-image.yml",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  "docs/architecture.md",
  "docs/deployment.md",
  "docs/development.md",
  "docs/semantic-search.md",
  "src/indexer/README.md",
];

for (const file of requiredFiles) {
  const text = readFileSync(join(root, file), "utf8");
  if (text.trim().length === 0) {
    throw new Error(`${file} is empty`);
  }
}

const requiredReadmeSnippets = [
  "Claude Desktop",
  "Cursor",
  "VS Code Copilot MCP",
  "Codex CLI",
  "Hermes Agent",
  "OpenClaw",
  "systemd",
  "pm2",
  "Docker Compose",
  "mcpServers",
  "[mcp_servers.memos]",
  "mcp_servers:",
  "openclaw mcp set",
];

const readme = readFileSync(join(root, "README.md"), "utf8");
for (const snippet of requiredReadmeSnippets) {
  if (!readme.includes(snippet)) {
    throw new Error(`README.md is missing required snippet: ${snippet}`);
  }
}

const forbiddenSecretPattern = /memos_pat_(?!x{4,}\b)[A-Za-z0-9_-]{16,}/;
const ignoredDirs = new Set([
  ".git",
  ".firecrawl",
  "coverage",
  "dist",
  "node_modules",
]);

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue;
    if (entry === ".env" || (entry.startsWith(".env.") && entry !== ".env.example")) {
      continue;
    }
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }
    const rel = relative(root, fullPath).replaceAll("\\", "/");
    const text = readFileSync(fullPath, "utf8");
    if (forbiddenSecretPattern.test(text)) {
      throw new Error(`Potential real Memos PAT found in ${rel}`);
    }
  }
}

walk(root);

console.log("Repository docs, README config snippets, and secret hygiene checks passed");

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
  "examples/claude-desktop.json",
  "examples/cursor.json",
  "examples/vscode.json",
  "examples/codex.toml",
  "examples/hermes.yaml",
  "examples/openclaw.yaml",
  "examples/docker-compose.yaml",
  "examples/memos-mcp.service",
  "examples/pm2.config.cjs",
  "docs/quick-start.md",
  "docs/configuration.md",
  "docs/transports.md",
  "docs/tools.md",
  "docs/docker.md",
  "docs/deployment.md",
  "docs/security.md",
  "docs/troubleshooting.md",
  "docs/development.md",
  "docs/memos-api-compatibility.md",
  "docs/semantic-search.md",
  "src/indexer/README.md",
];

for (const file of requiredFiles) {
  const text = readFileSync(join(root, file), "utf8");
  if (text.trim().length === 0) {
    throw new Error(`${file} is empty`);
  }
}

for (const file of [
  "examples/claude-desktop.json",
  "examples/cursor.json",
  "examples/vscode.json",
]) {
  JSON.parse(readFileSync(join(root, file), "utf8"));
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

console.log("Examples, docs, and secret hygiene checks passed");

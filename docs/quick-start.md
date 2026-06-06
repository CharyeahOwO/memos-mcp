# Quick Start

## Prerequisites

- Node.js 20 or newer.
- A running Memos instance.
- A Memos Personal Access Token from Memos settings.

## Install From Source

```bash
git clone https://github.com/CharyeahOwO/memos-mcp.git
cd memos-mcp
npm install
copy .env.example .env
npm run build
```

Edit `.env`:

```env
MEMOS_BASE_URL=http://127.0.0.1:5230
MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx
MEMOS_MCP_TRANSPORT=stdio
```

## Run With stdio

```bash
npm run start
```

Use stdio for Claude Desktop, Cursor, VS Code, Codex CLI, and other local MCP clients that start the server process themselves.

## Run With Local HTTP

```bash
set MEMOS_MCP_TRANSPORT=http
set MEMOS_BASE_URL=http://127.0.0.1:5230
npm run start
```

The endpoint is:

```text
http://127.0.0.1:8080/mcp
```

Health check:

```bash
curl http://127.0.0.1:8080/healthz
```

HTTP MCP clients must send:

```http
Authorization: Bearer memos_pat_xxxxxxxx
```

## Verify

```bash
npm run verify
npm run smoke:http
```

If you have a reachable Memos instance and token:

```bash
set MEMOS_BASE_URL=https://memos.example.com
set MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx
npm run smoke:memos
```

By default `smoke:memos` only performs a read request. For a disposable/test Memos instance, set `MEMOS_MCP_SMOKE_WRITE=true` to create, update, and archive one private smoke memo.

If setup fails, check [`troubleshooting.md`](./troubleshooting.md).

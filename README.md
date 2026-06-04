# memos-mcp

**English** | [简体中文](./README.zh-CN.md)

A [Model Context Protocol](https://modelcontextprotocol.io) server for [Memos](https://github.com/usememos/memos) — expose your Memos instance to AI clients as a searchable, safely-writable memory backend.

> **Status:** Early development (`v0.1.0`). The core read/write tools work over both stdio and HTTP. Semantic search, time-based retrieval, and packaging are on the roadmap.

`memos-mcp` is built to be a **public, production-quality tool**, not a personal glue script. It can run locally for a single user, or be hosted so that callers bring their own Memos credentials per request — without the server ever storing a token.

## Features

- **Core memo tools** — list, get, create, and keyword-search your memos.
- **Two transports** — `stdio` for local desktop clients (Claude Desktop, Cursor, …) and **Streamable HTTP** for remote / hosted use.
- **Bring-your-own-token auth** — in HTTP mode the caller supplies `Authorization: Bearer <token>` per request; the server stores no credentials and isolates callers by their token (the same model used by GitHub's MCP server).
- **Safe by default** — destructive tools are not implemented in this release; a global read-only mode hides all write tools; new memos default to `PRIVATE` visibility; the HTTP server binds to `127.0.0.1`.
- **Version-resilient** — upstream Memos responses are normalized into a stable internal shape, insulating the rest of the system from Memos API drift across versions.
- **No heavy dependencies** — the base server runs without any embedding or vector libraries. Semantic search will be an opt-in extension.

## Requirements

- Node.js **20+**
- A reachable [Memos](https://github.com/usememos/memos) instance (v0.24+ recommended)
- A Memos **Personal Access Token** (Settings → Access Tokens, format `memos_pat_…`)

## Quick Start

```bash
git clone https://github.com/CharyeahOwO/memos-mcp.git
cd memos-mcp
npm install
cp .env.example .env   # then edit .env
npm run build
```

### Run locally (stdio)

For local desktop MCP clients. The server uses a single token from the environment.

```bash
MEMOS_BASE_URL=https://memos.example.com \
MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx \
npm run start
```

During development, use `npm run dev` (watch mode) instead of building first.

### Run as an HTTP server

For remote / hosted use. No token in the environment — each caller brings their own.

```bash
MEMOS_MCP_TRANSPORT=http \
MEMOS_BASE_URL=https://memos.example.com \
npm run start
```

The server listens on `http://127.0.0.1:8080/mcp` with a health check at `/healthz`.

> **Exposing it publicly:** keep the bind on `127.0.0.1` and put a reverse proxy with **HTTPS** in front of it. Never bind `0.0.0.0` directly to the internet. Each caller must send their own `Authorization: Bearer <their memos token>`.

## Client Configuration

### stdio (e.g. Claude Desktop)

```json
{
  "mcpServers": {
    "memos": {
      "command": "node",
      "args": ["/absolute/path/to/memos-mcp/dist/index.js"],
      "env": {
        "MEMOS_BASE_URL": "https://memos.example.com",
        "MEMOS_ACCESS_TOKEN": "memos_pat_xxxxxxxx"
      }
    }
  }
}
```

### HTTP (caller-supplied token)

```json
{
  "mcpServers": {
    "memos": {
      "type": "http",
      "url": "https://your-host.example.com/mcp",
      "headers": {
        "Authorization": "Bearer memos_pat_xxxxxxxx"
      }
    }
  }
}
```

## Tools

| Tool | Description | Mode |
| --- | --- | --- |
| `memos_list` | List recent memos (newest first), with pagination. | read |
| `memos_get` | Get a single memo by id or resource name (`memos/123`). | read |
| `memos_search` | Keyword search over memo content (native Memos matching, not semantic). | read |
| `memos_create` | Create a memo. Defaults to the server's configured visibility (`PRIVATE`). | write |

When `MEMOS_MCP_READONLY=true`, write tools are not registered and disappear from the client's tool list.

## Configuration

All configuration is via environment variables. See [`.env.example`](./.env.example) for the annotated list.

| Variable | Default | Description |
| --- | --- | --- |
| `MEMOS_BASE_URL` | — | **Required.** Memos instance URL (no trailing slash). |
| `MEMOS_ACCESS_TOKEN` | — | Personal Access Token. **Required for stdio**; optional for HTTP (callers bring their own). |
| `MEMOS_MCP_TRANSPORT` | `stdio` | `stdio` or `http`. |
| `MEMOS_MCP_HOST` | `127.0.0.1` | HTTP bind address. |
| `MEMOS_MCP_PORT` | `8080` | HTTP port. |
| `MEMOS_MCP_DEFAULT_VISIBILITY` | `PRIVATE` | Default visibility for created memos (`PRIVATE` / `PROTECTED` / `PUBLIC`). |
| `MEMOS_MCP_READONLY` | `false` | When `true`, hides all write tools. |
| `MEMOS_MCP_TIMEZONE` | `UTC` | Default timezone (IANA name), used by upcoming time-based tools. |
| `MEMOS_MCP_MEMOS_API_VERSION` | — | Target Memos version baseline (informational). |

## Architecture

```
AI Client
  │  MCP (stdio | Streamable HTTP)
  ▼
Transport Layer            speaks MCP only, no business logic
  ▼
Tool Registry / Auth       registers tools per config, enforces read-only,
                           resolves the credential for each call
  ▼
Application / Memos Client wraps the Memos REST API, normalizes responses
  ▼
Memos Instance
```

Key ideas:

- **The credential source is an abstraction.** stdio reads it from the environment; HTTP reads it from the per-request `Authorization` header. A future hosted, multi-user mode can add another resolver without touching the rest of the code.
- **A normalization layer** converts upstream Memos responses into a stable internal record, so Memos API changes between versions stay contained in one place.

See [`docs/architecture.md`](./docs/architecture.md), [`docs/decisions.md`](./docs/decisions.md), and [`docs/roadmap.md`](./docs/roadmap.md) for the full design.

## Development

```bash
npm run dev         # run with tsx in watch mode (stdio)
npm run dev:http    # run in HTTP mode
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # bundle with tsup -> dist/
```

## Security

- Access tokens are never written to disk or logs; log output redacts tokens to their `memos_pat_` prefix.
- Memo content is not logged.
- The HTTP server binds to `127.0.0.1` by default and warns if bound elsewhere.
- Destructive tools are not part of this release. Read-only mode is available globally.

## Roadmap

The project is built in stages. The current release is **Step 1 (core read/write module)**.

### Done

- [x] Project skeleton: config validation, transports, auth abstraction, normalization layer.
- [x] `memos_list`, `memos_get`, `memos_search`, `memos_create`.
- [x] stdio + stateless Streamable HTTP transports.
- [x] Read-only mode and per-request auth.

### Next — more core tools

- [ ] `memos_get_day`, `memos_get_range`, `memos_on_this_day` — timezone-aware time retrieval.
- [ ] `memos_get_by_tag`, `tags_list` — tag tools.
- [ ] `resources_list` — read-only attachment listing.
- [ ] Permission-gated `memos_update` / `memos_archive` (disabled by default).

### Later — semantic search (opt-in extension)

- [ ] Local SQLite cache + FTS5 keyword index.
- [ ] `memos_semantic_search`, `memos_sync_index`, `memos_index_status`.
- [ ] Embedding providers: `disabled` / `local` / `openai-compatible`.
- [ ] Per-credential index isolation for multi-user hosting.

### Later — packaging & distribution

- [ ] Publish to npm (`npx memos-mcp`).
- [ ] Docker image and Compose example.
- [ ] CI (lint / typecheck / test / build) and release workflow.
- [ ] Client config examples (Claude Desktop, Cursor, VS Code).
- [ ] Optional `.mcpb` one-click bundle.

## License

[MIT](./LICENSE) © CharyeahOwO

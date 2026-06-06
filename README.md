# memos-mcp

**English** | [简体中文](./README.zh-CN.md)

[![CI](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/ci.yml)
[![Docker Image](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/docker-image.yml/badge.svg)](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/docker-image.yml)

A [Model Context Protocol](https://modelcontextprotocol.io) server for [Memos](https://github.com/usememos/memos) — expose your Memos instance to AI clients as a searchable, safely-writable memory backend.

> **Status:** Early development (`v0.1.0`). Core read/write tools, optional semantic search, local stdio/HTTP transports, Docker packaging, CI, and native service examples are included.

`memos-mcp` is built to be a **local-first, production-quality tool**, not a personal glue script and not a hosted cloud service. The project supports two deployment profiles: a lightweight local retrieval server, and a local retrieval server with an optional vector/semantic-search index.

## Features

- **Core memo tools** — list, get, create, keyword-search, time lookup, tag lookup, and resource listing.
- **Two local transports** — `stdio` for local desktop clients (Claude Desktop, Cursor, …) and **Streamable HTTP** for local HTTP-capable MCP clients.
- **Local credential handling** — in stdio mode the token comes from the environment; in local HTTP mode the client may supply `Authorization: Bearer <token>` per request. The server is not intended to be a public multi-user gateway.
- **Safe by default** — destructive tools are not implemented in this release; update/archive tools are disabled unless explicitly enabled; a global read-only mode hides all write tools; `memos_create` requires an explicit visibility choice; the HTTP server binds to `127.0.0.1`.
- **Version-resilient** — upstream Memos responses are normalized into a stable internal shape, insulating the rest of the system from Memos API drift across versions.
- **Optional semantic search** — when enabled, `memos_search` defaults to local semantic search over a JSON vector index built with OpenAI-compatible embeddings.
- **No heavy base dependencies** — the base server runs without SQLite, embedding libraries, or vector databases. The semantic profile is enabled only by configuration.

## Supported Clients

Known configuration examples are included for:

| Client / Runtime | Recommended transport | Example |
| --- | --- | --- |
| Claude Desktop | stdio | [`examples/claude-desktop.json`](./examples/claude-desktop.json) |
| Cursor | stdio | [`examples/cursor.json`](./examples/cursor.json) |
| VS Code Copilot MCP | stdio | [`examples/vscode.json`](./examples/vscode.json) |
| Codex CLI | stdio | [`examples/codex.toml`](./examples/codex.toml) |
| Hermes Agent | local Streamable HTTP | [`examples/hermes.yaml`](./examples/hermes.yaml) |
| OpenClaw | local Streamable HTTP | [`examples/openclaw.yaml`](./examples/openclaw.yaml) |
| systemd service | local Streamable HTTP | [`examples/memos-mcp.service`](./examples/memos-mcp.service) |
| pm2 service | local Streamable HTTP | [`examples/pm2.config.cjs`](./examples/pm2.config.cjs) |
| Docker Compose | local Streamable HTTP | [`docker-compose.example.yml`](./docker-compose.example.yml) |

Other MCP clients usually work if they support either stdio server launch or Streamable HTTP at `/mcp`.

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

## Deployment Methods

### 1. Local Retrieval (Base Profile)

Use this when you want a lightweight local MCP server that forwards calls to your Memos instance. No local index is created.

#### stdio

For local desktop MCP clients. The server uses a single token from the environment.

```bash
MEMOS_BASE_URL=https://memos.example.com \
MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx \
npm run start
```

During development, use `npm run dev` (watch mode) instead of building first.

#### Local Streamable HTTP

For local HTTP-capable MCP clients. The local client sends `Authorization: Bearer <token>` with each request.

```bash
MEMOS_MCP_TRANSPORT=http \
MEMOS_BASE_URL=https://memos.example.com \
npm run start
```

The server listens on `http://127.0.0.1:8080/mcp` with a health check at `/healthz`.

> **Local-only stance:** this project no longer targets hosted cloud service deployment. Keep the bind on `127.0.0.1` unless you explicitly know why you need LAN access, and do not expose it directly to the public internet.

For native service deployment, see [`docs/deployment.md`](./docs/deployment.md). For Docker and Compose, see [`docs/docker.md`](./docs/docker.md). Docker builds are validated by GitHub Actions because this development machine does not require a local Docker install.

### 2. Local Retrieval + Semantic Search

Use this when you want `memos_search` to search by meaning instead of only keyword matching. This profile keeps the index on your local filesystem and requires an OpenAI-compatible embeddings endpoint.

```bash
MEMOS_MCP_ENABLE_SEMANTIC_SEARCH=true \
MEMOS_MCP_INDEX_DB=./data/memos-mcp-index.json \
MEMOS_MCP_EMBEDDING_PROVIDER=openai-compatible \
MEMOS_MCP_EMBEDDING_BASE_URL=http://127.0.0.1:11434/v1 \
MEMOS_MCP_EMBEDDING_MODEL=nomic-embed-text \
MEMOS_BASE_URL=https://memos.example.com \
MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx \
npm run start
```

After the server is connected by your MCP client:

1. Call `memos_sync_index` once to build or refresh the local index.
2. Call `memos_index_status` to confirm the index is ready.
3. Use `memos_search` normally; when semantic search is enabled, `mode: "auto"` defaults to semantic search.
4. Pass `mode: "keyword"` when you specifically want Memos native keyword search.

## Client Configuration

Most MCP clients support one of two shapes:

- **stdio**: the client starts `node dist/index.js` and passes environment variables.
- **Streamable HTTP**: `memos-mcp` runs as a local HTTP service and the client connects to `http://127.0.0.1:8080/mcp` with an `Authorization` header.

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

### HTTP (local client)

```json
{
  "mcpServers": {
    "memos": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:8080/mcp",
      "headers": {
        "Authorization": "Bearer memos_pat_xxxxxxxx"
      }
    }
  }
}
```

More copyable examples are in [`examples/`](./examples), including Claude Desktop, Cursor, VS Code, Codex CLI, Hermes Agent, OpenClaw, systemd, pm2, and Docker Compose.

## Tools

| Tool | Description | Mode |
| --- | --- | --- |
| `memos_list` | List recent memos (newest first), with pagination. | read |
| `memos_get` | Get a single memo by id or resource name (`memos/123`). | read |
| `memos_search` | Search memos. Defaults to semantic search when semantic indexing is enabled; otherwise uses native Memos keyword matching. | read |
| `memos_get_day` | Get memos created on one calendar day in a selected timezone. | read |
| `memos_get_range` | Get memos created in an inclusive date range. | read |
| `memos_on_this_day` | Get historical memos from the same month/day. | read |
| `memos_get_by_tag` | Get memos with a specific tag. | read |
| `tags_list` | List tags and counts by scanning memos. | read |
| `resources_list` | List memo resources/attachments by scanning memos. | read |
| `memos_create` | Create a memo. The model must explicitly choose `PRIVATE` / `PROTECTED` / `PUBLIC`. | write |
| `memos_update` | Update content, visibility, pinned state, or memo state. Disabled by default. | write |
| `memos_archive` | Archive a memo by setting state to `ARCHIVED`. Disabled by default. | write |
| `memos_sync_index` | Sync Memos content into the local semantic index. Enabled only in semantic profile. | read |
| `memos_index_status` | Inspect semantic index readiness, count, dimensions, and model. Enabled only in semantic profile. | read |

`memos_update` and `memos_archive` require `MEMOS_MCP_ENABLE_UPDATE_TOOLS=true`. When `MEMOS_MCP_READONLY=true`, all write tools are not registered and disappear from the client's tool list.

## Configuration

All configuration is via environment variables. See [`.env.example`](./.env.example) for the annotated list.

| Variable | Default | Description |
| --- | --- | --- |
| `MEMOS_BASE_URL` | — | **Required.** Memos instance URL (no trailing slash). |
| `MEMOS_ACCESS_TOKEN` | — | Personal Access Token. **Required for stdio**; optional for local HTTP if the client sends `Authorization: Bearer <token>`. |
| `MEMOS_MCP_TRANSPORT` | `stdio` | `stdio` or `http`. |
| `MEMOS_MCP_HOST` | `127.0.0.1` | HTTP bind address. |
| `MEMOS_MCP_PORT` | `8080` | HTTP port. |
| `MEMOS_MCP_READONLY` | `false` | When `true`, hides all write tools. |
| `MEMOS_MCP_ENABLE_UPDATE_TOOLS` | `false` | When `true`, registers `memos_update` and `memos_archive` unless read-only mode is enabled. |
| `MEMOS_MCP_ENABLE_SEMANTIC_SEARCH` | `false` | When `true`, `memos_search` defaults to semantic search and index tools are registered. |
| `MEMOS_MCP_INDEX_DB` | `./data/memos-mcp-index.json` | Local semantic index file. |
| `MEMOS_MCP_EMBEDDING_PROVIDER` | `disabled` | `disabled` or `openai-compatible`. |
| `MEMOS_MCP_EMBEDDING_BASE_URL` | — | OpenAI-compatible embedding base URL, such as `http://127.0.0.1:11434/v1`. |
| `MEMOS_MCP_EMBEDDING_MODEL` | — | Embedding model name. |
| `MEMOS_MCP_EMBEDDING_API_KEY` | — | Optional embedding API key. |
| `MEMOS_MCP_TIMEZONE` | `UTC` | Default timezone (IANA name), used by time-based tools. |
| `MEMOS_MCP_MEMOS_API_VERSION` | — | Target Memos version baseline (informational). |

## Architecture

```
AI Client
  │  MCP (local stdio | local Streamable HTTP)
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

- **The credential source is an abstraction.** stdio reads it from the environment; local HTTP can read it from the per-request `Authorization` header. This is for local flexibility, not hosted multi-user service.
- **A normalization layer** converts upstream Memos responses into a stable internal record, so Memos API changes between versions stay contained in one place.

See [`docs/architecture.md`](./docs/architecture.md), [`docs/decisions.md`](./docs/decisions.md), and [`docs/roadmap.md`](./docs/roadmap.md) for the full design.
Operational docs: [`docs/quick-start.md`](./docs/quick-start.md), [`docs/configuration.md`](./docs/configuration.md), [`docs/transports.md`](./docs/transports.md), [`docs/tools.md`](./docs/tools.md), [`docs/semantic-search.md`](./docs/semantic-search.md), [`docs/docker.md`](./docs/docker.md), [`docs/deployment.md`](./docs/deployment.md), [`docs/security.md`](./docs/security.md), [`docs/troubleshooting.md`](./docs/troubleshooting.md), and [`docs/development.md`](./docs/development.md).

## Development

```bash
npm run dev         # run with tsx in watch mode (stdio)
npm run dev:http    # run in HTTP mode
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # bundle with tsup -> dist/
npm run smoke:http  # build output starts as local HTTP and passes /healthz
```

CI runs typecheck, tests, build, and example validation on Node.js 20 and 22. The Docker Image workflow builds the container image in GitHub Actions and publishes GHCR images on pushes to `main` or version tags.

## Security

- Access tokens are never written to disk or logs; log output redacts tokens to their `memos_pat_` prefix.
- Memo content is not logged.
- The HTTP server binds to `127.0.0.1` by default and warns if bound elsewhere.
- Destructive tools are not part of this release. Update/archive tools are opt-in, and read-only mode is available globally.

## Roadmap

The project is built in stages. The current release includes **Step 1 (core read/write module)** plus the first optional semantic-search profile.

### Done

- [x] Project skeleton: config validation, transports, auth abstraction, normalization layer.
- [x] `memos_list`, `memos_get`, `memos_search`, `memos_create`.
- [x] `memos_get_day`, `memos_get_range`, `memos_on_this_day`, `memos_get_by_tag`, `tags_list`, `resources_list`.
- [x] Permission-gated `memos_update` / `memos_archive` (disabled by default).
- [x] Local stdio + local Streamable HTTP transports.
- [x] Read-only mode and local HTTP header auth.

### Semantic Search

- [x] Local JSON vector index.
- [x] `memos_search` defaults to semantic when semantic search is enabled.
- [x] `memos_sync_index`, `memos_index_status`.
- [x] Embedding providers: `disabled` / `openai-compatible`.
- [ ] SQLite/FTS5 backend for larger local indexes.
- [ ] Local in-process embedding model provider.

### Later — packaging & distribution

- [ ] Publish to npm (`npx memos-mcp`).
- [x] Docker image and Compose example.
- [x] CI (typecheck / test / build / example validation) and Docker image workflow.
- [x] Client config examples (Claude Desktop, Cursor, VS Code).
- [ ] Optional `.mcpb` one-click bundle.

## License

[MIT](./LICENSE) © CharyeahOwO

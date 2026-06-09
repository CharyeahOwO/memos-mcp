# Agent Runbook for memos-mcp

This file is written for AI agents. Use it as the shortest reliable path to understand, configure, deploy, and verify `memos-mcp` without reading the full README first.

## First Reply To The Human

Before installing anything, identify the current agent/client environment if you can. For example, infer whether you are running inside Claude Code, Codex CLI, Cursor, OpenClaw, Hermes Agent, or another MCP-capable client. Then ask the human for the missing deployment details in one concise message.

Do not begin deployment until you have enough answers to choose the transport and fill the runtime configuration.

Ask for:

- Deployment target: persistent service or client-launched stdio.
- Whether the human wants you to enable this MCP server in the current agent/client now.
- If you can detect the current client, state your detected client and ask for confirmation before editing that client's config.
- Memos instance URL.
- Memos Personal Access Token.
- OpenAI-compatible embedding base URL, usually ending in `/v1`.
- Embedding model name.
- Embedding API key, if the embedding endpoint requires one.
- Preferred timezone, if date search should not use UTC.

Use this shape for your first message, adjusted to what you can already infer:

```text
I can deploy memos-mcp for you. I first need these details:

1. Deployment mode: Docker Compose persistent service, local HTTP service, or stdio launched by your MCP client?
2. Should I also enable it in the current MCP client? I detected: <client or unknown>. Please confirm the target client.
3. Memos URL:
4. Memos API token:
5. Embedding base URL:
6. Embedding model:
7. Embedding API key, if needed:
8. Timezone, optional:

After you provide these, I will configure the service, deploy it, connect the client if requested, and verify it with memos_index_status and memos_search.
```

If the human already provided some values, do not ask again. Ask only for the missing required fields.

## Project Summary

`memos-mcp` turns a Memos instance into an MCP-accessible long-term memory layer. It reads memo data through the Memos API, stores embeddings in a local JSON vector index, and exposes read/search/write tools over stdio or Streamable HTTP.

Primary users connect through Claude Desktop, Cursor, VS Code Copilot MCP, Codex CLI, Hermes Agent, OpenClaw, or any MCP client that supports stdio or Streamable HTTP.

## Read Order

1. Start here.
2. Use `README.md` for complete user-facing setup examples.
3. Use `docs/deployment.md` for deployment-specific details.
4. Use `docs/architecture.md` before changing server, auth, tool, or index behavior.
5. Use `docs/development.md` before adding tools or preparing a release.
6. Use `docs/semantic-search.md` before changing indexing or embedding logic.

## Repository Map

```text
src/
  auth/       Memos token resolution
  config/     environment parsing and runtime config
  indexer/    local JSON vector index, embedding calls, sync scheduler
  logging/    logger utilities
  memos/      Memos API client, compatibility normalization, upstream types
  server/     stdio and HTTP MCP server setup
  tools/      MCP tool definitions and handlers
tests/        vitest coverage for config, client, tools, and index behavior
docs/         architecture, deployment, development, semantic search
scripts/      validation and smoke-test scripts
```

## Non-Negotiable Rules

- Do not commit real Memos tokens, embedding API keys, memo exports, local vector indexes, `dist/`, `node_modules/`, or `.env`.
- Keep examples using placeholders such as `memos_pat_xxxx` and `sk_xxxx`.
- Keep `memos_search` semantic by default. Keyword search is an explicit `mode: "keyword"`.
- Do not add delete tools. Existing write tools are gated by config.
- `memos_create` must require explicit visibility.
- `memos_update` and `memos_archive` must stay hidden unless `MEMOS_MCP_ENABLE_UPDATE_TOOLS=true`.
- `MEMOS_MCP_READONLY=true` must hide all write tools.
- HTTP should bind to `127.0.0.1` unless the deployment explicitly handles access control.
- Tokens and memo content must not be logged.

## Required Runtime Inputs

Every deployment needs:

```env
MEMOS_BASE_URL=https://memos.example.com
MEMOS_ACCESS_TOKEN=memos_pat_xxxx
MEMOS_MCP_INDEX_DB=./data/memos-mcp-index.json
MEMOS_MCP_EMBEDDING_PROVIDER=openai-compatible
MEMOS_MCP_EMBEDDING_BASE_URL=https://api.example.com/v1
MEMOS_MCP_EMBEDDING_MODEL=BAAI/bge-m3
MEMOS_MCP_EMBEDDING_API_KEY=sk_xxxx
```

The embedding base URL must accept OpenAI-compatible requests at `/v1/embeddings`.

## Choose A Deployment Mode

Use stdio when the MCP client starts the server process directly.

Use Streamable HTTP when the MCP client connects to an already-running endpoint such as:

```text
http://127.0.0.1:8080/mcp
```

Use Docker Compose when the server should run as a persistent local service with an isolated `/data` volume.

Use systemd or pm2 when deploying from source on a Linux host.

## Deploy From Source With stdio

Use this when configuring Claude Desktop, Cursor, VS Code Copilot MCP, or Codex CLI to launch `memos-mcp`.

```bash
git clone https://github.com/CharyeahOwO/memos-mcp.git
cd memos-mcp
npm install
cp .env.example .env
npm run build
```

Set `.env`:

```env
MEMOS_BASE_URL=https://memos.example.com
MEMOS_ACCESS_TOKEN=memos_pat_xxxx
MEMOS_MCP_TRANSPORT=stdio
MEMOS_MCP_INDEX_DB=./data/memos-mcp-index.json
MEMOS_MCP_EMBEDDING_PROVIDER=openai-compatible
MEMOS_MCP_EMBEDDING_BASE_URL=https://api.example.com/v1
MEMOS_MCP_EMBEDDING_MODEL=BAAI/bge-m3
MEMOS_MCP_EMBEDDING_API_KEY=sk_xxxx
MEMOS_MCP_SYNC_ON_START=true
```

Start command:

```bash
node --env-file=.env dist/index.js
```

Client config shape:

```json
{
  "mcpServers": {
    "memos": {
      "command": "node",
      "args": ["/absolute/path/to/memos-mcp/dist/index.js"],
      "env": {
        "MEMOS_BASE_URL": "https://memos.example.com",
        "MEMOS_ACCESS_TOKEN": "memos_pat_xxxx",
        "MEMOS_MCP_INDEX_DB": "./data/memos-mcp-index.json",
        "MEMOS_MCP_EMBEDDING_PROVIDER": "openai-compatible",
        "MEMOS_MCP_EMBEDDING_BASE_URL": "https://api.example.com/v1",
        "MEMOS_MCP_EMBEDDING_MODEL": "BAAI/bge-m3",
        "MEMOS_MCP_EMBEDDING_API_KEY": "sk_xxxx"
      }
    }
  }
}
```

## Deploy From Source With HTTP

Use this when the MCP client supports Streamable HTTP.

```bash
git clone https://github.com/CharyeahOwO/memos-mcp.git
cd memos-mcp
npm install
cp .env.example .env
npm run build
```

Set `.env`:

```env
MEMOS_BASE_URL=https://memos.example.com
MEMOS_ACCESS_TOKEN=memos_pat_xxxx
MEMOS_MCP_TRANSPORT=http
MEMOS_MCP_HOST=127.0.0.1
MEMOS_MCP_PORT=8080
MEMOS_MCP_INDEX_DB=./data/memos-mcp-index.json
MEMOS_MCP_EMBEDDING_PROVIDER=openai-compatible
MEMOS_MCP_EMBEDDING_BASE_URL=https://api.example.com/v1
MEMOS_MCP_EMBEDDING_MODEL=BAAI/bge-m3
MEMOS_MCP_EMBEDDING_API_KEY=sk_xxxx
MEMOS_MCP_SYNC_ON_START=true
```

Start:

```bash
node --env-file=.env dist/index.js
```

Endpoints:

```text
MCP:    http://127.0.0.1:8080/mcp
Health: http://127.0.0.1:8080/healthz
```

HTTP MCP clients must send:

```http
Authorization: Bearer <Memos token>
```

Generic client config shape:

```json
{
  "mcpServers": {
    "memos": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:8080/mcp",
      "headers": {
        "Authorization": "Bearer memos_pat_xxxx"
      }
    }
  }
}
```

## Deploy With Docker Compose

Use the included compose file as the base:

```bash
cp .env.example .env
docker compose -f docker-compose.example.yml up -d --build
```

Set at least these values in `.env`:

```env
MEMOS_BASE_URL=http://host.docker.internal:5230
MEMOS_ACCESS_TOKEN=memos_pat_xxxx
MEMOS_MCP_EMBEDDING_BASE_URL=https://api.example.com/v1
MEMOS_MCP_EMBEDDING_MODEL=BAAI/bge-m3
MEMOS_MCP_EMBEDDING_API_KEY=sk_xxxx
MEMOS_MCP_TIMEZONE=Asia/Shanghai
```

The compose service exposes:

```text
http://127.0.0.1:8080/mcp
http://127.0.0.1:8080/healthz
```

The image runs as UID/GID `10001:10001` and stores the local index under `/data`. A new named volume works without extra ownership changes. If using a bind mount, make the host directory writable by UID/GID `10001:10001`.

Check service state:

```bash
docker compose -f docker-compose.example.yml ps
docker compose -f docker-compose.example.yml logs -f memos-mcp
```

## First Verification After Deployment

1. Check the process starts without config errors.
2. For HTTP mode, open `http://127.0.0.1:8080/healthz`.
3. In the MCP client, list tools and confirm these are present:

```text
memos_list
memos_get
memos_search
memos_sync_index
memos_index_status
```

4. Run `memos_index_status`.
5. Run `memos_sync_index` if the index is empty.
6. Run:

```json
{
  "query": "test"
}
```

through `memos_search`.

7. If keyword search is needed, run:

```json
{
  "query": "test",
  "mode": "keyword"
}
```

## Local Development Checks

Before handing code changes back:

```bash
npm run typecheck
npm test
npm run build
npm run validate:repo
npm run validate:docker
```

For docs-only changes, at least run:

```bash
npm run validate:repo
```

Use `npm run verify` for the full local gate.

## Troubleshooting

Startup fails with embedding config errors:

- Set `MEMOS_MCP_EMBEDDING_BASE_URL`.
- Set `MEMOS_MCP_EMBEDDING_MODEL`.
- Confirm the endpoint serves `/v1/embeddings`.

HTTP auth fails:

- Send `Authorization: Bearer <Memos token>` to `/mcp`.
- In stdio mode, set `MEMOS_ACCESS_TOKEN`.

Semantic search says the index is empty:

- Check Memos auth.
- Check embedding config.
- Run `memos_sync_index`.

Embedding dimensions changed:

- Run `memos_sync_index` with:

```json
{
  "force": true
}
```

Docker sync gets `EACCES`:

- Prefer the named volume in `docker-compose.example.yml`.
- For bind mounts, make the host directory writable by UID/GID `10001:10001`.

Date tools return unexpected days:

- Set `MEMOS_MCP_TIMEZONE`, for example `Asia/Shanghai`.

## Handoff Checklist

Before telling the user deployment is done, report:

- deployment mode: stdio, HTTP, Docker Compose, systemd, or pm2
- endpoint or client config path
- index path
- whether `memos_index_status` succeeded
- whether `memos_search` succeeded
- any skipped verification and why

# memos-mcp

**English** | [简体中文](./README.zh-CN.md)

[![CI](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/ci.yml)
[![Docker Image](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/docker-image.yml/badge.svg)](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/docker-image.yml)

Local-first [Model Context Protocol](https://modelcontextprotocol.io) server for [Memos](https://github.com/usememos/memos). It exposes your own Memos instance to local AI clients as a searchable, safely writable memory backend.

No author-hosted cloud service. No public multi-user gateway. Tokens and indexes stay in your local/private environment.

## Supported

Clients and runtimes:

| Client / runtime | Transport | Status |
| --- | --- | --- |
| Claude Desktop | stdio | supported |
| Cursor | stdio | supported |
| VS Code Copilot MCP | stdio | supported |
| Codex CLI | stdio | supported |
| Hermes Agent | Streamable HTTP | supported |
| OpenClaw | Streamable HTTP | supported |
| systemd / pm2 | Streamable HTTP service | supported |
| Docker Compose | Streamable HTTP service | supported |

Deployment profiles:

| Profile | What it does |
| --- | --- |
| Local retrieval | Forwards MCP tool calls to your Memos API. No local index. |
| Local retrieval + semantic search | Adds a local JSON vector index. `memos_search` defaults to semantic search after sync. |

## Install

```bash
git clone https://github.com/CharyeahOwO/memos-mcp.git
cd memos-mcp
npm install
cp .env.example .env
npm run build
```

Minimum config:

```env
MEMOS_BASE_URL=https://memos.example.com
MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx
MEMOS_MCP_TRANSPORT=stdio
```

## Run

### stdio

Use stdio when the MCP client starts the server process.

```bash
MEMOS_BASE_URL=https://memos.example.com \
MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx \
npm run start
```

### Local Streamable HTTP

Use HTTP when you want a local service. The client sends the Memos token in the request header.

```bash
MEMOS_MCP_TRANSPORT=http \
MEMOS_BASE_URL=https://memos.example.com \
npm run start
```

Endpoint: `http://127.0.0.1:8080/mcp`

Health check: `http://127.0.0.1:8080/healthz`

### Semantic Search

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

After connecting from your MCP client:

1. Call `memos_sync_index`.
2. Call `memos_index_status`.
3. Use `memos_search`; `mode: "auto"` is semantic when semantic search is enabled.
4. Use `mode: "keyword"` to force Memos native keyword search.

## Client Configuration

Replace `/absolute/path/to/memos-mcp` with your local path.

### Claude Desktop / Cursor

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

### VS Code Copilot MCP

```json
{
  "servers": {
    "memos": {
      "type": "stdio",
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

### Codex CLI

```toml
[mcp_servers.memos]
command = "node"
args = ["/absolute/path/to/memos-mcp/dist/index.js"]

[mcp_servers.memos.env]
MEMOS_BASE_URL = "https://memos.example.com"
MEMOS_ACCESS_TOKEN = "memos_pat_xxxxxxxx"
```

### Generic Streamable HTTP

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

### Hermes Agent

```yaml
mcp_servers:
  memos:
    url: "http://127.0.0.1:8080/mcp"
    headers:
      Authorization: "Bearer memos_pat_xxxxxxxx"
    connect_timeout: 10
    timeout: 60
    enabled: true
```

### OpenClaw

```yaml
mcp:
  servers:
    memos:
      url: "http://127.0.0.1:8080/mcp"
      transport: "streamable-http"
      connectionTimeoutMs: 10000
      headers:
        Authorization: "Bearer memos_pat_xxxxxxxx"
```

CLI shape:

```bash
openclaw mcp set memos '{"url":"http://127.0.0.1:8080/mcp","transport":"streamable-http","headers":{"Authorization":"Bearer memos_pat_xxxxxxxx"}}'
```

## Deployment

### Docker Compose

```yaml
services:
  memos-mcp:
    image: ghcr.io/charyeahowo/memos-mcp:main
    restart: unless-stopped
    environment:
      MEMOS_BASE_URL: http://host.docker.internal:5230
      MEMOS_MCP_TRANSPORT: http
      MEMOS_MCP_HOST: 0.0.0.0
      MEMOS_MCP_PORT: 8080
      MEMOS_MCP_READONLY: "false"
      MEMOS_MCP_ENABLE_UPDATE_TOOLS: "false"
    ports:
      - "127.0.0.1:8080:8080"
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Docker builds are validated by GitHub Actions; a local Docker install is not required for development on this machine.

### systemd

```ini
[Unit]
Description=memos-mcp
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/memos-mcp
EnvironmentFile=/etc/memos-mcp/memos-mcp.env
ExecStart=/usr/bin/node /opt/memos-mcp/dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Environment file:

```env
MEMOS_BASE_URL=http://127.0.0.1:5230
MEMOS_MCP_TRANSPORT=http
MEMOS_MCP_HOST=127.0.0.1
MEMOS_MCP_PORT=8080
```

### pm2

```js
module.exports = {
  apps: [
    {
      name: "memos-mcp",
      script: "dist/index.js",
      env: {
        MEMOS_BASE_URL: "http://127.0.0.1:5230",
        MEMOS_MCP_TRANSPORT: "http",
        MEMOS_MCP_HOST: "127.0.0.1",
        MEMOS_MCP_PORT: "8080"
      }
    }
  ]
};
```

## Tools

| Tool | Mode | Notes |
| --- | --- | --- |
| `memos_list` | read | list recent memos |
| `memos_get` | read | get one memo by id or `memos/{id}` |
| `memos_search` | read | semantic by default when enabled; keyword otherwise |
| `memos_get_day` | read | timezone-aware day lookup |
| `memos_get_range` | read | timezone-aware range lookup |
| `memos_on_this_day` | read | same month/day history |
| `memos_get_by_tag` | read | tag lookup |
| `tags_list` | read | local tag aggregation |
| `resources_list` | read | local resource aggregation |
| `memos_create` | write | requires explicit `PRIVATE` / `PROTECTED` / `PUBLIC` |
| `memos_update` | write | opt-in via `MEMOS_MCP_ENABLE_UPDATE_TOOLS=true` |
| `memos_archive` | write | opt-in via `MEMOS_MCP_ENABLE_UPDATE_TOOLS=true` |
| `memos_sync_index` | read | semantic profile only |
| `memos_index_status` | read | semantic profile only |

When `MEMOS_MCP_READONLY=true`, all write tools are hidden from `tools/list`.

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `MEMOS_BASE_URL` | required | Memos instance URL |
| `MEMOS_ACCESS_TOKEN` | stdio required | optional for HTTP if client sends `Authorization` |
| `MEMOS_MCP_TRANSPORT` | `stdio` | `stdio` or `http` |
| `MEMOS_MCP_HOST` | `127.0.0.1` | HTTP bind host |
| `MEMOS_MCP_PORT` | `8080` | HTTP port |
| `MEMOS_MCP_READONLY` | `false` | hides write tools |
| `MEMOS_MCP_ENABLE_UPDATE_TOOLS` | `false` | enables update/archive |
| `MEMOS_MCP_TIMEZONE` | `UTC` | IANA timezone |
| `MEMOS_MCP_ENABLE_SEMANTIC_SEARCH` | `false` | enables semantic index tools and semantic-by-default search |
| `MEMOS_MCP_INDEX_DB` | `./data/memos-mcp-index.json` | local JSON vector index |
| `MEMOS_MCP_EMBEDDING_PROVIDER` | `disabled` | `disabled` or `openai-compatible` |
| `MEMOS_MCP_EMBEDDING_BASE_URL` | unset | OpenAI-compatible base URL |
| `MEMOS_MCP_EMBEDDING_MODEL` | unset | embedding model |
| `MEMOS_MCP_EMBEDDING_API_KEY` | unset | optional embedding API key |
| `MEMOS_MCP_EMBEDDING_BATCH_SIZE` | `32` | 1-128 |

## Development

```bash
npm run typecheck
npm test
npm run build
npm run validate:repo
npm run smoke:http
```

Combined check:

```bash
npm run verify
```

GitHub Actions runs CI on Node.js 20 and 22 and builds/pushes the Docker image through GHCR on `main` and version tags.

## More Docs

- [Architecture](./docs/architecture.md)
- [Deployment](./docs/deployment.md)
- [Development](./docs/development.md)
- [Semantic Search](./docs/semantic-search.md)

## License

[MIT](./LICENSE) © CharyeahOwO

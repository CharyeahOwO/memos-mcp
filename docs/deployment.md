# Deployment

memos-mcp runs as one local semantic retrieval service: Memos API access, a local JSON vector index, and an OpenAI-compatible embedding endpoint.

## Native HTTP Service

```bash
npm ci
cp .env.example .env
npm run build
```

Set at least these values in `.env`:

```env
MEMOS_BASE_URL=http://127.0.0.1:5230
MEMOS_ACCESS_TOKEN=memos_pat_xxxx
MEMOS_MCP_TRANSPORT=http
MEMOS_MCP_HOST=127.0.0.1
MEMOS_MCP_PORT=8080
MEMOS_MCP_INDEX_DB=./data/memos-mcp-index.json
MEMOS_MCP_EMBEDDING_PROVIDER=openai-compatible
MEMOS_MCP_EMBEDDING_BASE_URL=http://127.0.0.1:11434/v1
MEMOS_MCP_EMBEDDING_MODEL=nomic-embed-text
MEMOS_MCP_INDEX_TTL_MINUTES=120
MEMOS_MCP_EXPIRED_INDEX_BEHAVIOR=sync
MEMOS_MCP_SYNC_INTERVAL_MINUTES=120
MEMOS_MCP_SYNC_ON_START=true
```

```bash
node --env-file=.env dist/index.js
```

Endpoint: `http://127.0.0.1:8080/mcp`

Health check: `http://127.0.0.1:8080/healthz`

HTTP MCP clients must send `Authorization: Bearer <Memos token>` on requests to `/mcp`.

`MEMOS_ACCESS_TOKEN` is also used by server-side startup and interval sync. If it is empty in HTTP mode, request-time search can still sync with the request's `Authorization` header, but background sync is skipped.

## Docker Compose

The README includes a copyable Compose service. The repository also includes `docker-compose.example.yml`.

The image creates `/data` as UID/GID `10001:10001`, so a new named volume can be written by the non-root process. If a root-owned named volume was created by an older image, recreate the volume or fix its ownership before syncing the index.

If `MEMOS_MCP_INDEX_DB` points into a bind mount, make the host directory writable by UID/GID `10001:10001`:

```bash
mkdir -p /tmp/memos-mcp-data
sudo chown -R 10001:10001 /tmp/memos-mcp-data
```

## systemd

The README includes a copyable unit file and environment file. Put the vector index somewhere writable by the service user, for example `/var/lib/memos-mcp/memos-mcp-index.json`.

Use `journalctl -u memos-mcp` for logs.

## pm2

The README includes a copyable pm2 config. Keep `MEMOS_MCP_INDEX_DB` under a writable local path and keep API keys out of committed pm2 files.

## Reverse Proxy

Only put a reverse proxy in front of the HTTP transport when the MCP client cannot connect to localhost directly.

- Terminate TLS if traffic leaves localhost.
- Require authentication at the proxy.
- Preserve the MCP client's `Authorization` header.
- Route `/mcp` and `/healthz` to the local service.

## Runtime Data

The local vector index defaults to:

```text
./data/memos-mcp-index.json
```

Use separate index paths for separate Memos accounts or embedding models.

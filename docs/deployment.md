# Deployment

memos-mcp is intended for local/private deployment only. Keep HTTP bound to `127.0.0.1` unless you explicitly need LAN access.

## Native HTTP Service

```bash
npm ci
npm run verify
set MEMOS_BASE_URL=http://127.0.0.1:5230
set MEMOS_MCP_TRANSPORT=http
set MEMOS_MCP_HOST=127.0.0.1
set MEMOS_MCP_PORT=8080
npm run start
```

Endpoint: `http://127.0.0.1:8080/mcp`

Health check: `http://127.0.0.1:8080/healthz`

## Docker Compose

The README includes a copyable Compose service. Keep host port publishing on `127.0.0.1`.

The repository also includes `docker-compose.example.yml` for users who prefer a file-based starting point.

## systemd

The README includes a copyable unit file and environment file. Use `journalctl -u memos-mcp` for logs.

## pm2

The README includes a copyable pm2 config. Keep secrets out of committed pm2 files.

## Reverse Proxy

Only use a reverse proxy for LAN/private access.

- Terminate TLS if traffic leaves localhost.
- Require authentication at the proxy.
- Preserve the MCP client's `Authorization` header.
- Route `/mcp` and `/healthz` to the local service.

## Data

Base profile does not persist data.

Semantic profile stores the local JSON vector index at `MEMOS_MCP_INDEX_DB`, defaulting to:

```text
./data/memos-mcp-index.json
```

Use separate index paths for separate Memos accounts.

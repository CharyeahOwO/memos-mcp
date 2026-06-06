# Deployment

memos-mcp is local-first. Deploy it on the same machine as your AI client, on a private workstation, or on a private host you control. Do not expose it directly to the public internet.

## Native Service

Build once:

```bash
npm ci
npm run verify
```

Run local HTTP:

```bash
set MEMOS_BASE_URL=http://127.0.0.1:5230
set MEMOS_MCP_TRANSPORT=http
set MEMOS_MCP_HOST=127.0.0.1
set MEMOS_MCP_PORT=8080
npm run start
```

Use `MEMOS_MCP_ENABLE_UPDATE_TOOLS=true` only when you want `memos_update` and `memos_archive` to appear in clients.

## systemd

Copy the example service:

```bash
sudo install -d -o memos-mcp -g memos-mcp /opt/memos-mcp
sudo install -d /etc/memos-mcp
sudo cp examples/memos-mcp.service /etc/systemd/system/memos-mcp.service
```

Create `/etc/memos-mcp/memos-mcp.env`:

```env
MEMOS_BASE_URL=http://127.0.0.1:5230
MEMOS_MCP_TRANSPORT=http
MEMOS_MCP_HOST=127.0.0.1
MEMOS_MCP_PORT=8080
MEMOS_MCP_READONLY=false
MEMOS_MCP_ENABLE_UPDATE_TOOLS=false
MEMOS_MCP_TIMEZONE=UTC
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now memos-mcp
sudo systemctl status memos-mcp
```

Logs are available through `journalctl -u memos-mcp`.

## pm2

Use `examples/pm2.config.cjs` as a starting point:

```bash
pm2 start examples/pm2.config.cjs
pm2 save
```

Keep secrets out of the PM2 file if the file is committed. Prefer process manager environment files for real tokens.

## Reverse Proxy

The recommended bind address is still `127.0.0.1`. If you put a reverse proxy in front for LAN-only access:

- Terminate TLS at the proxy if traffic leaves localhost.
- Require authentication at the proxy.
- Do not strip the MCP client's `Authorization: Bearer <Memos PAT>` header.
- Keep `/mcp` and `/healthz` routed to the local service.

## Data Directories

The base profile does not persist data. The semantic profile stores its JSON vector index at `MEMOS_MCP_INDEX_DB`, defaulting to `./data/memos-mcp-index.json`. Put that path under a local data directory, for example `./data`, and use separate paths for separate Memos accounts. Future SQLite/FTS indexes should use the same local data boundary.

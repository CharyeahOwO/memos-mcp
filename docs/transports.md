# Transports

memos-mcp supports the two mainstream MCP transport shapes used by current clients.

## stdio

Use stdio when the MCP client starts the server process.

```json
{
  "mcpServers": {
    "memos": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/memos-mcp/dist/index.js"],
      "env": {
        "MEMOS_BASE_URL": "http://127.0.0.1:5230",
        "MEMOS_ACCESS_TOKEN": "memos_pat_xxxxxxxx"
      }
    }
  }
}
```

This is the preferred mode for local desktop/IDE clients.

## Streamable HTTP

Use local Streamable HTTP when the client connects to an already-running server.

Start the server:

```bash
set MEMOS_MCP_TRANSPORT=http
set MEMOS_BASE_URL=http://127.0.0.1:5230
npm run start
```

Client config shape:

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

Some clients use `"http"` instead of `"streamable-http"` in their config UI. Prefer the client documentation when naming the transport; the endpoint remains `/mcp`.

## Hermes Agent

Hermes Agent commonly reads MCP servers from `~/.hermes/config.yaml` under `mcp_servers`. For local HTTP mode:

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

See [`examples/hermes.yaml`](../examples/hermes.yaml).

## OpenClaw

OpenClaw uses `mcp.servers` and the Streamable HTTP transport spelling:

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

Equivalent CLI shape:

```bash
openclaw mcp set memos '{"url":"http://127.0.0.1:8080/mcp","transport":"streamable-http","headers":{"Authorization":"Bearer memos_pat_xxxxxxxx"}}'
```

See [`examples/openclaw.yaml`](../examples/openclaw.yaml).

## Client Shape Notes (2026-06-06)

Common client config shapes are not identical:

- Claude Desktop, Claude Code, Cursor, Cline-style clients commonly use a top-level `mcpServers` object.
- VS Code Copilot uses a `servers` object in user or workspace `mcp.json`.
- Hermes Agent uses `mcp_servers` in YAML.
- OpenClaw uses `mcp.servers` and `transport: "streamable-http"`.
- Some clients spell the HTTP type as `http`, `streamable-http`, or `streamableHttp`. Keep the URL as `http://127.0.0.1:8080/mcp` and follow the client's own naming.

Copyable examples are in `examples/`.

## SSE

SSE is not implemented. Streamable HTTP is the intended HTTP transport.

# Troubleshooting

## `stdio 模式必须设置 MEMOS_ACCESS_TOKEN`

stdio clients start the server process directly, so the server must receive `MEMOS_ACCESS_TOKEN` through environment variables.

For local HTTP mode, set `MEMOS_MCP_TRANSPORT=http` and send `Authorization: Bearer <token>` from the client instead.

## HTTP client gets an auth error

Check the client sends:

```http
Authorization: Bearer memos_pat_xxxxxxxx
```

The header must be present on MCP tool calls, not only on health checks.

## `memos_update` or `memos_archive` is missing

This is expected by default. Enable them explicitly:

```env
MEMOS_MCP_ENABLE_UPDATE_TOOLS=true
```

If `MEMOS_MCP_READONLY=true`, all write tools remain hidden even when update tools are enabled.

## Date tools return fewer results than expected

Time, tag, and resource tools aggregate locally from paginated Memos results. Increase `pageSize` or `maxPages` in the tool call.

Also check `MEMOS_MCP_TIMEZONE`; calendar-day matching depends on the configured IANA timezone.

## Port already in use

Change the HTTP port:

```env
MEMOS_MCP_PORT=18080
```

Then update the client URL to `http://127.0.0.1:18080/mcp`.

## Memos API search behaves differently after Memos upgrades

Memos has changed API fields and filter syntax across versions. This project normalizes response fields in `src/memos/normalize.ts` and documents known drift in `docs/memos-api-compatibility.md`.

If a new version breaks search, prefer fixing the Memos client or normalization layer instead of changing every tool.

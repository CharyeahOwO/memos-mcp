# memos-mcp TODO

This repository is planned as a complete open-source MCP server for Memos. Do not intentionally build it as a half-finished toy.

## Product Positioning

- [ ] Build a general-purpose MCP server for usememos/Memos.
- [ ] Support both personal use and public open-source usage.
- [ ] Keep the project easy to run, easy to configure, and easy to contribute to.
- [ ] Avoid hard-coding MuLing-specific domains, tokens, paths, or private behavior.
- [ ] Keep dangerous write/delete tools opt-in.

## Deployment Modes

- [ ] Local stdio transport for desktop/local MCP clients.
- [ ] HTTP / Streamable HTTP transport.
- [ ] Optional SSE compatibility if useful for existing clients.
- [ ] Docker image.
- [ ] Docker Compose example.
- [ ] Local package execution, preferably `npx` if TypeScript is chosen.
- [ ] systemd service example.
- [ ] pm2 example.
- [ ] Hermes/OpenClaw MCP config example.
- [ ] Claude Desktop config example.
- [ ] Cursor / VSCode MCP config examples.
- [ ] Codex CLI MCP config example if compatible.

## Core Tools

- [ ] `memos_list` — list recent memos.
- [ ] `memos_get` — get one memo by id/resource name.
- [ ] `memos_create` — create a memo.
- [ ] `memos_search` — keyword / API search.
- [ ] `memos_get_day` — get memos for one calendar day.
- [ ] `memos_get_range` — get memos in a time range.
- [ ] `memos_get_by_tag` — get memos by tag.
- [ ] `memos_on_this_day` — retrieve historical memos from the same month/day.
- [ ] `memos_semantic_search` — semantic search over indexed memo content.
- [ ] `memos_sync_index` — sync Memos data into local index.
- [ ] `memos_index_status` — inspect index sync and embedding status.

## Optional / Permission-Gated Tools

- [ ] `memos_update` — disabled by default, enabled with config.
- [ ] `memos_archive` — disabled by default, enabled with config.
- [ ] `memos_delete` — disabled by default, explicit destructive opt-in only.
- [ ] `resources_list` — safe read-only resource listing.
- [ ] `resources_upload` — optional, disabled by default.
- [ ] `resources_delete` — destructive, disabled by default.
- [ ] `tags_list` — safe tag listing.
- [ ] `tags_rename` — optional, disabled by default.

## Search and Indexing

- [ ] Normalize Memos API responses into stable internal memo records.
- [ ] Store memo cache in SQLite.
- [ ] Add SQLite FTS5 keyword index.
- [ ] Add time-based indexes for fast date/range retrieval.
- [ ] Add embedding cache.
- [ ] Support semantic search provider: `disabled`.
- [ ] Support semantic search provider: `local`.
- [ ] Support semantic search provider: `openai-compatible`.
- [ ] Support local embeddings, likely via `@xenova/transformers` if TypeScript is chosen.
- [ ] Support OpenAI-compatible embedding endpoint configuration.
- [ ] Add manual sync command/tool.
- [ ] Add optional scheduled/background sync.
- [ ] Ensure timezone-aware date search.

## Configuration

- [ ] `.env.example`.
- [ ] Strict config validation.
- [ ] `MEMOS_BASE_URL`.
- [ ] `MEMOS_ACCESS_TOKEN`.
- [ ] `MEMOS_MCP_TRANSPORT`.
- [ ] `MEMOS_MCP_HOST`.
- [ ] `MEMOS_MCP_PORT`.
- [ ] `MEMOS_MCP_DEFAULT_VISIBILITY`.
- [ ] `MEMOS_MCP_READONLY`.
- [ ] `MEMOS_MCP_ENABLE_UPDATE_TOOLS`.
- [ ] `MEMOS_MCP_ENABLE_DELETE_TOOLS`.
- [ ] `MEMOS_MCP_ENABLE_RESOURCE_TOOLS`.
- [ ] `MEMOS_MCP_INDEX_DB`.
- [ ] `MEMOS_MCP_ENABLE_FTS`.
- [ ] `MEMOS_MCP_ENABLE_SEMANTIC_SEARCH`.
- [ ] `MEMOS_MCP_EMBEDDING_PROVIDER`.
- [ ] `MEMOS_MCP_EMBEDDING_MODEL`.
- [ ] `MEMOS_MCP_EMBEDDING_BASE_URL`.
- [ ] `MEMOS_MCP_EMBEDDING_API_KEY`.
- [ ] `MEMOS_MCP_TIMEZONE`.

## Safety Defaults

- [ ] Default visibility should be `PRIVATE` unless configured otherwise.
- [ ] Provide read-only mode.
- [ ] Delete tools must be disabled by default.
- [ ] Update/archive tools should be disabled by default or clearly permission-gated.
- [ ] HTTP server should default to `127.0.0.1`.
- [ ] Document reverse proxy/auth expectations for remote HTTP usage.
- [ ] Never log access tokens or API keys.
- [ ] Avoid exposing private memo content in debug logs.

## Documentation

- [ ] `docs/quick-start.md`.
- [ ] `docs/configuration.md`.
- [ ] `docs/transports.md`.
- [ ] `docs/tools.md`.
- [ ] `docs/semantic-search.md`.
- [ ] `docs/docker.md`.
- [ ] `docs/security.md`.
- [ ] `docs/memos-api-compatibility.md`.
- [ ] `docs/development.md`.
- [ ] Example config for Hermes/OpenClaw.
- [ ] Example config for Claude Desktop.
- [ ] Example config for Cursor / VSCode.
- [ ] Example config for Docker Compose.

## Open Source Project Quality

- [ ] Choose license, likely MIT.
- [ ] Add contribution guide.
- [ ] Add code of conduct if the project becomes public-facing.
- [ ] Add issue templates.
- [ ] Add PR template.
- [ ] Add CI for lint, typecheck, tests, build.
- [ ] Add release workflow.
- [ ] Publish npm package if TypeScript is chosen.
- [ ] Publish Docker image.
- [ ] Add badges after CI/release exists.

## Candidate Existing Projects to Study

- [ ] `chriscurrycc/memos-mcp` — broad Memos tool surface, useful to copy/fork conceptually.
- [ ] `shynloc/acks-memos-mcp-server` — semantic search / local vector engine reference.
- [ ] `wolfsilver/memos-mcp` — Go Streamable HTTP reference.
- [ ] `mylxsw/memos-mcp-server` — Python FastMCP reference.
- [ ] `LeslieLeung/mcp-server-memos` — minimal Python reference.

## Open Questions

- [ ] TypeScript vs Python vs Go.
- [ ] Fork an existing project or start clean.
- [ ] Whether to include a Web admin UI.
- [ ] Whether to support multi-user tokens.
- [ ] Whether resource upload belongs in the initial public surface.
- [ ] How strict Memos version compatibility should be.
- [ ] Whether semantic index should sync automatically by default.

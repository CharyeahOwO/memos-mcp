# memos-mcp TODO

This repository is planned as a complete local-first open-source MCP server for Memos. Do not build it as a half-finished toy, and do not position it as an author-hosted cloud service.

## Product Positioning

- [ ] Build a general-purpose local MCP server for usememos/Memos.
- [ ] Support two local deployment profiles: base local retrieval and local retrieval with vector search.
- [ ] Keep the project easy to run, easy to configure, and easy to contribute to.
- [ ] Avoid hard-coding MuLing-specific domains, tokens, paths, or private behavior.
- [ ] Do not provide an author-hosted cloud service.
- [ ] Do not build a public multi-user MCP gateway.
- [ ] Keep dangerous write/delete tools opt-in.

## Deployment Profiles

### Base Local Retrieval

- [x] Local stdio transport for desktop/local MCP clients.
- [x] Local HTTP / Streamable HTTP transport bound to `127.0.0.1` by default.
- [ ] Docker image for private/local deployment.
- [ ] Docker Compose example for private/local deployment.
- [ ] Local package execution, preferably `npx memos-mcp`.
- [ ] systemd service example.
- [ ] pm2 example.
- [ ] Hermes/OpenClaw MCP config example.
- [ ] Claude Desktop config example.
- [ ] Cursor / VS Code MCP config examples.
- [ ] Codex CLI MCP config example if compatible.

### Local Retrieval + Vector Search

- [ ] Optional local SQLite memo cache.
- [ ] Optional SQLite FTS5 keyword index.
- [ ] Optional embedding cache.
- [ ] Optional semantic search tools.
- [ ] Local model cache / embedding-provider configuration.
- [ ] Clear single-user local index boundary.
- [ ] Multiple-account guidance: run multiple instances with separate `MEMOS_MCP_INDEX_DB` paths.

## Core Tools

- [x] `memos_list` — list recent memos.
- [x] `memos_get` — get one memo by id/resource name.
- [x] `memos_create` — create a memo.
- [x] `memos_search` — keyword / API search.
- [ ] `memos_get_day` — get memos for one calendar day.
- [ ] `memos_get_range` — get memos in a time range.
- [ ] `memos_get_by_tag` — get memos by tag.
- [ ] `memos_on_this_day` — retrieve historical memos from the same month/day.
- [ ] `resources_list` — safe read-only resource listing.
- [ ] `tags_list` — safe tag listing.

## Vector Tools

- [ ] `memos_semantic_search` — semantic search over indexed local memo content.
- [ ] `memos_sync_index` — sync Memos data into local index.
- [ ] `memos_index_status` — inspect local index sync and embedding status.

## Optional / Permission-Gated Tools

- [ ] `memos_update` — disabled by default, enabled with config.
- [ ] `memos_archive` — disabled by default, enabled with config.
- [ ] `memos_delete` — disabled by default, explicit destructive opt-in only.
- [ ] `resources_upload` — optional, disabled by default.
- [ ] `resources_delete` — destructive, disabled by default.
- [ ] `tags_rename` — optional, disabled by default.

## Search and Indexing

### Base Local Retrieval

- [x] Normalize Memos API responses into stable internal memo records.
- [x] Use Memos native API/CEL filter for keyword search.
- [ ] Ensure timezone-aware date search.
- [ ] Document Memos API filter compatibility.

### Local Vector Search

- [ ] Store memo cache in SQLite.
- [ ] Add SQLite FTS5 keyword index.
- [ ] Add time-based indexes for fast date/range retrieval.
- [ ] Add tag/resource indexes.
- [ ] Add embedding cache.
- [ ] Support semantic search provider: `disabled`.
- [ ] Support semantic search provider: `local`.
- [ ] Support semantic search provider: `openai-compatible`.
- [ ] Support local embeddings, likely via `@xenova/transformers`.
- [ ] Support OpenAI-compatible embedding endpoint configuration.
- [ ] Add manual sync command/tool.
- [ ] Decide whether scheduled/background sync belongs in the local vector profile.

## Configuration

- [x] `.env.example`.
- [x] Strict config validation.
- [x] `MEMOS_BASE_URL`.
- [x] `MEMOS_ACCESS_TOKEN`.
- [x] `MEMOS_MCP_TRANSPORT`.
- [x] `MEMOS_MCP_HOST`.
- [x] `MEMOS_MCP_PORT`.
- [x] `MEMOS_MCP_DEFAULT_VISIBILITY`.
- [x] `MEMOS_MCP_READONLY`.
- [x] `MEMOS_MCP_TIMEZONE`.
- [x] `MEMOS_MCP_MEMOS_API_VERSION`.
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

## Safety Defaults

- [x] Default visibility should be `PRIVATE` unless configured otherwise.
- [x] Provide read-only mode.
- [x] Delete tools must be disabled by default.
- [ ] Update/archive tools should be disabled by default or clearly permission-gated.
- [x] HTTP server should default to `127.0.0.1`.
- [ ] Document local-only HTTP expectations and why public exposure is not a target.
- [x] Never log access tokens or API keys.
- [x] Avoid exposing private memo content in debug logs.
- [ ] Ensure vector indexes and embedding cache stay on local filesystem.
- [ ] Document external embedding-provider privacy tradeoffs.

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
- [ ] Example config for Cursor / VS Code.
- [ ] Example config for Docker Compose.

## Open Source Project Quality

- [x] Choose license: MIT.
- [ ] Add contribution guide.
- [ ] Add code of conduct if needed.
- [ ] Add issue templates.
- [ ] Add PR template.
- [ ] Add CI for lint, typecheck, tests, build.
- [ ] Add release workflow.
- [ ] Publish npm package.
- [ ] Publish Docker image.
- [ ] Add badges after CI/release exists.

## Candidate Existing Projects to Study

- [ ] `chriscurrycc/memos-mcp` — broad Memos tool surface, useful to study conceptually.
- [ ] `shynloc/acks-memos-mcp-server` — semantic search / local vector engine reference.
- [ ] `wolfsilver/memos-mcp` — Go Streamable HTTP reference.
- [ ] `mylxsw/memos-mcp-server` — Python FastMCP reference.
- [ ] `LeslieLeung/mcp-server-memos` — minimal Python reference.

## Open Questions

- [ ] How strict Memos version compatibility should be.
- [ ] Whether semantic index should sync automatically by default.
- [ ] Whether local embeddings should be the default provider when semantic search is enabled.
- [ ] Whether resource upload belongs in the default tool surface.
- [ ] Whether update/archive should ship before or after vector search.

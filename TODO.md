# memos-mcp TODO

This repository is planned as a complete local-first open-source MCP server for Memos. Do not build it as a half-finished toy, and do not position it as an author-hosted cloud service.

## Product Positioning

- [x] Build a general-purpose local MCP server for usememos/Memos.
- [x] Support two local deployment profiles: base local retrieval and local retrieval with vector search.
- [x] Keep the project easy to run, easy to configure, and easy to contribute to.
- [x] Avoid hard-coding MuLing-specific domains, tokens, paths, or private behavior.
- [x] Do not provide an author-hosted cloud service.
- [x] Do not build a public multi-user MCP gateway.
- [x] Keep dangerous write/delete tools opt-in.

## Deployment Profiles

### Base Local Retrieval

- [x] Local stdio transport for desktop/local MCP clients.
- [x] Local HTTP / Streamable HTTP transport bound to `127.0.0.1` by default.
- [x] Docker image for private/local deployment.
- [x] Docker Compose example for private/local deployment.
- [ ] Local package execution, preferably `npx memos-mcp`.
- [x] systemd service example.
- [x] pm2 example.
- [x] Hermes MCP config example.
- [x] OpenClaw MCP config example.
- [x] Claude Desktop config example.
- [x] Cursor / VS Code MCP config examples.
- [x] Codex CLI MCP config example if compatible.

### Local Retrieval + Vector Search

- [ ] Optional local SQLite memo cache.
- [ ] Optional SQLite FTS5 keyword index.
- [x] Optional local JSON embedding index.
- [x] Optional semantic search tools.
- [x] OpenAI-compatible embedding-provider configuration.
- [x] Clear single-user local index boundary.
- [x] Multiple-account guidance: run multiple instances with separate `MEMOS_MCP_INDEX_DB` paths.

## Core Tools

- [x] `memos_list` — list recent memos.
- [x] `memos_get` — get one memo by id/resource name.
- [x] `memos_create` — create a memo.
- [x] `memos_search` — semantic by default when enabled, keyword/API fallback otherwise.
- [x] `memos_get_day` — get memos for one calendar day.
- [x] `memos_get_range` — get memos in a time range.
- [x] `memos_get_by_tag` — get memos by tag.
- [x] `memos_on_this_day` — retrieve historical memos from the same month/day.
- [x] `resources_list` — safe read-only resource listing.
- [x] `tags_list` — safe tag listing.

## Vector Tools

- [x] `memos_search` semantic mode — semantic search over indexed local memo content.
- [x] `memos_sync_index` — sync Memos data into local index.
- [x] `memos_index_status` — inspect local index sync and embedding status.

## Optional / Permission-Gated Tools

- [x] `memos_update` — disabled by default, enabled with config.
- [x] `memos_archive` — disabled by default, enabled with config.
- [ ] `memos_delete` — disabled by default, explicit destructive opt-in only.
- [ ] `resources_upload` — optional, disabled by default.
- [ ] `resources_delete` — destructive, disabled by default.
- [ ] `tags_rename` — optional, disabled by default.

## Search and Indexing

### Base Local Retrieval

- [x] Normalize Memos API responses into stable internal memo records.
- [x] Use Memos native API/CEL filter for keyword search.
- [x] Ensure timezone-aware date search.
- [x] Document Memos API filter compatibility.

### Local Vector Search

- [x] Store memo cache in local JSON vector index.
- [ ] Store memo cache in SQLite.
- [ ] Add SQLite FTS5 keyword index.
- [ ] Add time-based indexes for fast date/range retrieval.
- [ ] Add tag/resource indexes.
- [x] Add embedding cache.
- [x] Support semantic search provider: `disabled`.
- [ ] Support semantic search provider: `local`.
- [x] Support semantic search provider: `openai-compatible`.
- [ ] Support local embeddings, likely via `@xenova/transformers`.
- [x] Support OpenAI-compatible embedding endpoint configuration.
- [x] Add manual sync command/tool.
- [ ] Decide whether scheduled/background sync belongs in the local vector profile.

## Configuration

- [x] `.env.example`.
- [x] Strict config validation.
- [x] `MEMOS_BASE_URL`.
- [x] `MEMOS_ACCESS_TOKEN`.
- [x] `MEMOS_MCP_TRANSPORT`.
- [x] `MEMOS_MCP_HOST`.
- [x] `MEMOS_MCP_PORT`.
- [x] `MEMOS_MCP_READONLY`.
- [x] `MEMOS_MCP_TIMEZONE`.
- [x] `MEMOS_MCP_MEMOS_API_VERSION`.
- [x] `MEMOS_MCP_ENABLE_UPDATE_TOOLS`.
- [ ] `MEMOS_MCP_ENABLE_DELETE_TOOLS`.
- [ ] `MEMOS_MCP_ENABLE_RESOURCE_TOOLS`.
- [x] `MEMOS_MCP_INDEX_DB`.
- [ ] `MEMOS_MCP_ENABLE_FTS`.
- [x] `MEMOS_MCP_ENABLE_SEMANTIC_SEARCH`.
- [x] `MEMOS_MCP_EMBEDDING_PROVIDER`.
- [x] `MEMOS_MCP_EMBEDDING_MODEL`.
- [x] `MEMOS_MCP_EMBEDDING_BASE_URL`.
- [x] `MEMOS_MCP_EMBEDDING_API_KEY`.
- [x] `MEMOS_MCP_EMBEDDING_BATCH_SIZE`.

## Safety Defaults

- [x] `memos_create` requires explicit visibility instead of server-side default visibility.
- [x] Provide read-only mode.
- [x] Delete tools must be disabled by default.
- [x] Update/archive tools should be disabled by default or clearly permission-gated.
- [x] HTTP server should default to `127.0.0.1`.
- [x] Document local-only HTTP expectations and why public exposure is not a target.
- [x] Never log access tokens or API keys.
- [x] Avoid exposing private memo content in debug logs.
- [x] Ensure vector indexes and embedding cache stay on local filesystem.
- [x] Document external embedding-provider privacy tradeoffs.

## Documentation

- [x] `docs/quick-start.md`.
- [x] `docs/configuration.md`.
- [x] `docs/transports.md`.
- [x] `docs/tools.md`.
- [x] `docs/semantic-search.md`.
- [x] `docs/docker.md`.
- [x] `docs/deployment.md`.
- [x] `docs/security.md`.
- [x] `docs/troubleshooting.md`.
- [x] `docs/memos-api-compatibility.md`.
- [x] `docs/development.md`.
- [x] Example config for Hermes.
- [x] Example config for OpenClaw.
- [x] Example config for Claude Desktop.
- [x] Example config for Cursor / VS Code.
- [x] Example config for Docker Compose.
- [x] Example config for systemd.
- [x] Example config for pm2.

## Open Source Project Quality

- [x] Choose license: MIT.
- [x] Add contribution guide.
- [ ] Add code of conduct if needed.
- [x] Add issue templates.
- [x] Add PR template.
- [x] Add CI for typecheck, tests, build.
- [x] Add Docker image workflow.
- [ ] Publish npm package.
- [x] Publish Docker image through GitHub Actions.
- [x] Add badges after CI/release exists.

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
- [x] Whether update/archive should ship before or after vector search.

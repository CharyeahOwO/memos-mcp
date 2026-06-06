# Security

## Local-First Boundary

memos-mcp is designed for local/private deployment. Do not expose it directly to the public internet.

Default HTTP host is `127.0.0.1`.

## Tokens

- Do not commit `.env`.
- Do not write Memos tokens into examples.
- stdio mode reads `MEMOS_ACCESS_TOKEN` from the environment.
- local HTTP mode reads `Authorization: Bearer <token>` from each request.
- Tokens are never intentionally logged.

## Write Safety

- Destructive tools are not implemented.
- `MEMOS_MCP_READONLY=true` hides write tools entirely.
- `MEMOS_MCP_ENABLE_UPDATE_TOOLS=false` hides `memos_update` and `memos_archive`.
- `memos_create` requires explicit visibility at call time.
- `memos_archive` only sets `state=ARCHIVED`; it does not delete memo data.

## External Embedding Providers

The base profile does not use embeddings. When the semantic profile is explicitly enabled with an OpenAI-compatible embedding provider, memo content is sent to that provider during indexing, and search text is sent during semantic queries. Use a local compatible endpoint if content must stay on the same machine.

## Local Index Data

The current semantic profile stores its JSON vector index at `MEMOS_MCP_INDEX_DB`. Future SQLite/FTS indexes should follow the same local-only boundary. For multiple Memos accounts, run multiple instances with separate index paths.

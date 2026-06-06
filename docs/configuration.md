# Configuration

All runtime configuration is read from environment variables in `src/config/index.ts`.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MEMOS_BASE_URL` | yes | - | Memos instance URL without trailing slash. |
| `MEMOS_ACCESS_TOKEN` | stdio only | - | Memos Personal Access Token. HTTP mode can receive the token from request headers. |
| `MEMOS_MCP_TRANSPORT` | no | `stdio` | `stdio` or `http`. |
| `MEMOS_MCP_HOST` | no | `127.0.0.1` | HTTP bind host. Keep localhost unless you explicitly need LAN access. |
| `MEMOS_MCP_PORT` | no | `8080` | HTTP bind port. |
| `MEMOS_MCP_READONLY` | no | `false` | When true, write tools such as `memos_create` are not registered. |
| `MEMOS_MCP_ENABLE_UPDATE_TOOLS` | no | `false` | When true, registers `memos_update` and `memos_archive` unless read-only mode is enabled. |
| `MEMOS_MCP_ENABLE_SEMANTIC_SEARCH` | no | `false` | When true, `memos_search` defaults to semantic search and index tools are registered. |
| `MEMOS_MCP_INDEX_DB` | no | `./data/memos-mcp-index.json` | Local JSON semantic index file. |
| `MEMOS_MCP_EMBEDDING_PROVIDER` | no | `disabled` | `disabled` or `openai-compatible`. |
| `MEMOS_MCP_EMBEDDING_BASE_URL` | semantic only | - | OpenAI-compatible embedding base URL, for example `http://127.0.0.1:11434/v1`. |
| `MEMOS_MCP_EMBEDDING_MODEL` | semantic only | - | Embedding model name. |
| `MEMOS_MCP_EMBEDDING_API_KEY` | no | - | Optional embedding API key. |
| `MEMOS_MCP_EMBEDDING_BATCH_SIZE` | no | `32` | Embedding batch size, 1-128. |
| `MEMOS_MCP_TIMEZONE` | no | `UTC` | IANA timezone for date-based tools. |
| `MEMOS_MCP_MEMOS_API_VERSION` | no | - | Informational compatibility baseline. |

## Visibility

`memos_create` does not use a server-side default visibility. The model/client must explicitly provide one of:

- `PRIVATE`
- `PROTECTED`
- `PUBLIC`

This makes the visibility decision visible at tool-call time instead of hiding it in deployment config.

## Permission Gates

Write tools are hidden from `tools/list` instead of being rejected at call time.

- `MEMOS_MCP_READONLY=true` hides every write tool.
- `MEMOS_MCP_ENABLE_UPDATE_TOOLS=false` hides `memos_update` and `memos_archive`.
- `MEMOS_MCP_ENABLE_SEMANTIC_SEARCH=false` keeps `memos_search` in keyword mode and hides index tools.
- Delete tools are not implemented in the current release.

## Semantic Search Profile

The semantic profile is optional and local-first. It stores a JSON vector index at `MEMOS_MCP_INDEX_DB` and uses an OpenAI-compatible embedding endpoint.

```env
MEMOS_MCP_ENABLE_SEMANTIC_SEARCH=true
MEMOS_MCP_INDEX_DB=./data/memos-mcp-index.json
MEMOS_MCP_EMBEDDING_PROVIDER=openai-compatible
MEMOS_MCP_EMBEDDING_BASE_URL=http://127.0.0.1:11434/v1
MEMOS_MCP_EMBEDDING_MODEL=nomic-embed-text
MEMOS_MCP_EMBEDDING_API_KEY=
MEMOS_MCP_EMBEDDING_BATCH_SIZE=32
```

When this profile is enabled, call `memos_sync_index` first. After sync, `memos_search` defaults to semantic mode. Use `mode: "keyword"` on a search call to force Memos native keyword search.

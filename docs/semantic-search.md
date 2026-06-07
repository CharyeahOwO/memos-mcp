# Semantic Search

Semantic search is the default search path in memos-mcp. The server stores memo embeddings in a local JSON vector index and uses that index when `memos_search` runs without `mode: "keyword"`.

## How It Works

1. Configure an OpenAI-compatible embedding endpoint.
2. Run `memos_sync_index`.
3. The server scans Memos page by page, embeds new or changed memo content and tags, and writes the local JSON index.
4. Embeddings are L2-normalized before storage and before query search.
5. `memos_search` embeds the query and ranks indexed memos by dot product, which is equivalent to cosine similarity for normalized vectors.

Force keyword search with:

```json
{
  "query": "project note",
  "mode": "keyword"
}
```

## Configuration

```env
MEMOS_MCP_INDEX_DB=./data/memos-mcp-index.json
MEMOS_MCP_EMBEDDING_PROVIDER=openai-compatible
MEMOS_MCP_EMBEDDING_BASE_URL=http://127.0.0.1:11434/v1
MEMOS_MCP_EMBEDDING_MODEL=nomic-embed-text
MEMOS_MCP_EMBEDDING_API_KEY=
MEMOS_MCP_EMBEDDING_BATCH_SIZE=32
MEMOS_MCP_INDEX_TTL_MINUTES=120
MEMOS_MCP_EXPIRED_INDEX_BEHAVIOR=sync
MEMOS_MCP_SYNC_INTERVAL_MINUTES=120
MEMOS_MCP_SYNC_ON_START=true
```

The embedding endpoint must follow the OpenAI embeddings shape:

```http
POST /v1/embeddings
```

Request:

```json
{
  "model": "nomic-embed-text",
  "input": ["memo content"]
}
```

Response:

```json
{
  "data": [
    { "index": 0, "embedding": [0.1, 0.2, 0.3] }
  ]
}
```

## Tools

- `memos_sync_index`: build or rebuild the local index.
- `memos_index_status`: inspect readiness, count, dimensions, model, and path.
- `memos_search`: semantic search by default, keyword search with `mode: "keyword"`.

`memos_sync_index` reuses existing embeddings when the memo content and tags have not changed. It returns `embedded`, `reused`, `pages`, and `force` so clients can see whether a sync was mostly incremental. If an embedding endpoint changes vector dimensions without changing the configured provider or model name, rebuild all vectors with:

```json
{
  "force": true
}
```

`memos_search` checks index freshness before semantic search. If the index is missing or expired and `MEMOS_MCP_EXPIRED_INDEX_BEHAVIOR=sync`, it runs an incremental sync first. `MEMOS_MCP_INDEX_TTL_MINUTES=0` disables expiration.

Long-running services also run background sync every `MEMOS_MCP_SYNC_INTERVAL_MINUTES` minutes. Scheduled startup/interval sync requires `MEMOS_ACCESS_TOKEN`; HTTP request-header tokens are only available during a request.

## Data And Providers

The JSON index is stored locally at `MEMOS_MCP_INDEX_DB`. The configured embedding provider receives memo content during indexing and search-query text during semantic retrieval.

In Docker, the process runs as UID/GID `10001:10001`, and the image creates `/data` with that ownership. New named volumes work by default. Existing root-owned volumes from older images should be recreated or fixed before syncing the index. For bind mounts, make the mounted directory writable by UID/GID `10001:10001`.

## Current Limits

- The current backend is a local JSON vector index for simple single-user deployments.
- JSON index reads are cached by file ctime/mtime/size to avoid repeated parse work during normal search while still noticing same-size rewrites.
- SQLite/FTS5 and larger vector storage can replace the JSON store later without changing the MCP tool surface.
- In-process local embedding models are not bundled; use an OpenAI-compatible endpoint.

# Semantic Search

Semantic search is the default search path in memos-mcp. The server stores memo embeddings in a local JSON vector index and uses that index when `memos_search` runs without `mode: "keyword"`.

## How It Works

1. Configure an OpenAI-compatible embedding endpoint.
2. Run `memos_sync_index`.
3. The server scans Memos, embeds memo content and tags, and writes the local JSON index.
4. `memos_search` embeds the query and ranks indexed memos by cosine similarity.

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

## Data And Providers

The JSON index is stored locally at `MEMOS_MCP_INDEX_DB`. The configured embedding provider receives memo content during indexing and search-query text during semantic retrieval.

In Docker, the process runs as UID/GID `10001:10001`. Named volumes work by default. For bind mounts, make the mounted directory writable by that UID/GID before syncing the index.

## Current Limits

- The current backend is a local JSON vector index for simple single-user deployments.
- SQLite/FTS5 and larger vector storage can replace the JSON store later without changing the MCP tool surface.
- In-process local embedding models are not bundled; use an OpenAI-compatible endpoint.

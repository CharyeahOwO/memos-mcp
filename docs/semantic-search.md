# Semantic Search

Semantic search is available as an optional local profile. The base profile remains lightweight and does not load SQLite, vector database, or embedding-model dependencies.

## How It Works

1. Enable the semantic profile with environment variables.
2. Run `memos_sync_index`.
3. The server scans Memos, embeds memo content and tags through an OpenAI-compatible `/v1/embeddings` endpoint, and writes a local JSON index.
4. After sync, `memos_search` defaults to semantic search.

Force keyword search with:

```json
{
  "query": "project note",
  "mode": "keyword"
}
```

## Configuration

```env
MEMOS_MCP_ENABLE_SEMANTIC_SEARCH=true
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
- `memos_search`: semantic by default when enabled.

## Privacy

The JSON index is stored locally at `MEMOS_MCP_INDEX_DB`. OpenAI-compatible providers may receive memo content during indexing and search-query embedding. Use a local endpoint such as Ollama, LM Studio, vLLM, or another private compatible service if content should not leave the machine.

## Current Limits

- The current backend is a local JSON vector index, designed for simple single-user local deployments.
- SQLite/FTS5 and larger vector storage are planned future upgrades.
- In-process local embedding models are not bundled; use an OpenAI-compatible local endpoint instead.

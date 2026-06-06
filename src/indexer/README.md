# Indexer Module

This directory implements the local vector index used by `memos_sync_index`, `memos_index_status`, and semantic `memos_search`.

Current responsibilities:

- Store memo embeddings in the local JSON index at `MEMOS_MCP_INDEX_DB`.
- Call an OpenAI-compatible `/v1/embeddings` endpoint.
- Sync memo pages, inspect index status, and run semantic search.

Future storage backends can replace the JSON index without changing the MCP tool surface. See `docs/architecture.md` and `docs/semantic-search.md`.

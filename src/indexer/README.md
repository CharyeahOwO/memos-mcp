# Indexer Module

This directory implements the optional local vector search profile.

Current responsibilities:

- Local JSON memo/embedding index stored at `MEMOS_MCP_INDEX_DB`.
- OpenAI-compatible embeddings through `/v1/embeddings`.
- Manual sync, status inspection, and semantic search.
- No base-profile dependency on SQLite, vector libraries, or local model runtimes.

Future improvements can replace the JSON store with SQLite/FTS/vector storage without changing the tool surface. See `docs/architecture.md` and `docs/semantic-search.md`.

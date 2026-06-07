# Changelog

## v0.1.0

Initial release candidate.

- Adds Memos MCP tools for listing, reading, searching, creating, tagging, time-based lookup, and resources.
- Uses local JSON vector indexing with OpenAI-compatible embeddings.
- Makes `memos_search` semantic by default and keeps keyword search available with `mode: "keyword"`.
- Maintains the vector index with startup sync, interval sync, TTL checks, and manual `memos_sync_index`.
- Supports stdio and Streamable HTTP MCP transports.
- Includes Docker, systemd, pm2, and MCP client setup documentation.

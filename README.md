# memos-mcp

A Model Context Protocol server for [Memos](https://github.com/usememos/memos) with semantic search, time-based retrieval, and safe write tools.

> Status: private planning repository. This project is intended to become an open-source, production-quality MCP server instead of a half-finished personal script.

## Project Goal

`memos-mcp` aims to provide a clean, deployable, and extensible MCP interface for Memos.

It should support:

- Multiple deployment modes: local stdio, HTTP / Streamable HTTP, Docker, Docker Compose, systemd / pm2.
- Core Memos operations: list, read, create, search.
- Time-based retrieval: day search, range search, "on this day" review.
- Semantic search: local embeddings and OpenAI-compatible embeddings.
- Safe permissions: read-only mode, destructive tools disabled by default, configurable write tools.
- Open-source quality: clear docs, examples, tests, CI, npm package, Docker image.

## Design Direction

This project should not be designed as a quick personal glue script.

It should be built as a public tool that a stranger can:

1. Clone or install quickly.
2. Configure without reading source code.
3. Run locally or in Docker.
4. Connect from common MCP clients.
5. Understand and contribute to without pain.

## Initial Scope

The project should be implemented as a full-featured system in one coherent architecture, not as a deliberately limited throwaway prototype.

See:

- [`TODO.md`](./TODO.md)
- [`docs/architecture.md`](./docs/architecture.md)

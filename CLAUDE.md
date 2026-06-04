# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

请始终用中文和用户交流。代码、注释、文档可按项目惯例使用英文，但所有对话、解释、提问都用中文。

## Repository Status

This is a **planning-only repository**. There is no source code yet — only `README.md`, `TODO.md`, and `docs/architecture.md`. There is no build, no tests, no package manifest, no chosen language.

The single commit so far is `docs: capture memos mcp architecture and todo`.

Consequently: **do not invent build/lint/test commands.** None exist. When the user starts implementation, the commands depend on which language/stack gets chosen (see "Undecided Decisions" below). Establish and document them at that point — do not assume TypeScript tooling is already wired up.

## What This Project Is

`memos-mcp` will be a Model Context Protocol server for [usememos/Memos](https://github.com/usememos/memos), exposing a Memos instance as a searchable, safely-writable memory backend for AI clients. It is explicitly intended as a **public, open-source, production-quality tool** — not a personal glue script.

The two design documents are the source of truth for intent. Read both before doing implementation work:
- `docs/architecture.md` — full layered architecture, normalized data shapes, config keys, deployment modes.
- `TODO.md` — the concrete feature/tooling checklist and open questions.

## Non-Negotiable Design Constraints

These come from the architecture doc's Non-Goals and Safety Model. They shape every implementation decision and should not be quietly violated:

- **No private/personal hard-coding.** No "MuLing"-specific domains, tokens, paths, or workflow assumptions baked into code. Everything user-specific goes through config.
- **Destructive tools off by default.** `memos_delete` / `resources_delete` are disabled unless explicitly opted in via config. `memos_update` / `memos_archive` / `resources_upload` / `tags_rename` are permission-gated.
- **Conservative defaults.** Default memo visibility `PRIVATE`; HTTP transport binds to `127.0.0.1`; a global read-only mode exists.
- **Semantic search is optional, not required.** Basic Memos tools must run with embeddings fully disabled and no embedding dependencies loaded.
- **Never log secrets or private content.** Access tokens / API keys must never appear in logs; debug logs must not dump memo content unless explicitly enabled.

## Architecture (the big picture)

The intended design is a strict layered pipeline (see `docs/architecture.md` for detail):

```
MCP Transport (stdio | streamable-http | optional sse)
  → Tool Registry / Permission Layer   (registers tools per config; enforces read-only & gating)
    → Application Services             (Memos API, Time Search, Keyword Search, Semantic Search, Index Sync)
      → Storage / Index Layer          (SQLite cache + FTS5 + embedding/vector store)
        → Memos REST API
```

Key cross-cutting ideas that require reading multiple sections to grasp:

- **The transport layer holds no Memos business logic** — it only speaks MCP. Business logic lives in Application Services.
- **The Memos client normalizes upstream responses** into a stable internal `NormalizedMemo` record (defined in `docs/architecture.md`), so the rest of the system is insulated from Memos API version drift.
- **Permission gating is centralized**, not scattered per-tool: tools are *registered or not* based on config, and read-only mode is enforced globally at this layer.
- **Time search is first-class**, not a prompt trick — `memos_get_day` / `memos_get_range` / `memos_on_this_day` must be timezone-aware with a configurable default timezone.
- **Search has two sources**: Memos native API search and a local SQLite FTS5 index; semantic search is a separate optional layer with three provider modes (`disabled` / `local` / `openai-compatible`).
- **The index layer (SQLite)** is the local cache/search substrate: tables for memos, tags, resources, sync_state, embeddings; supports full sync, incremental sync, rebuild, and status inspection.

## Configuration Model

Config is **environment-first with strict validation**. The full key set is enumerated in `docs/architecture.md` (the `MEMOS_*` / `MEMOS_MCP_*` variables). When implementing, treat that list as the spec and validate strictly (reject unknown/invalid rather than silently defaulting where it matters for safety).

## Undecided Decisions — confirm before assuming

Several foundational choices are **open** (see Open Questions in both docs). Do not silently pick one and build on it; surface the decision to the user first:

- **Language/stack**: TypeScript vs Python vs Go. TypeScript is the *leading candidate* (for npm/npx ergonomics) but is **not** finalized. The architecture doc's suggested folder layout and stack (`@modelcontextprotocol/sdk`, Hono/Express, Zod, `better-sqlite3`, Vitest, tsup, `@xenova/transformers`) are *recommendations contingent on choosing TypeScript*, not commitments.
- **Fork vs clean start** (candidate projects to study are listed in `TODO.md`).
- Whether semantic search syncs automatically by default.
- Whether update/archive tools are opt-in only.
- Whether resource upload belongs in the initial public surface.
- How strict Memos version compatibility should be.

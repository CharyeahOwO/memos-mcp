# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

请始终用中文和用户交流。代码、注释、文档可按项目惯例使用英文，但所有对话、解释、提问都用中文。用户不是程序员——解释技术概念要用大白话/打比方，做技术取舍时把选项讲清楚让用户拍板。

## What This Project Is

`memos-mcp` is a local-first Model Context Protocol server for [usememos/Memos](https://github.com/usememos/memos), exposing a user's own Memos instance as a searchable, safely-writable memory backend for local AI clients. It is built as a **local-first, open-source, production-quality tool**, not a personal glue script and not an author-hosted cloud service.

Current state: **Step 1 (base local retrieval module) is implemented, plus the first optional semantic-search profile.** TypeScript was chosen. Core read/write, time retrieval, tag, resource listing, permission-gated update/archive tools, local stdio, local HTTP, Docker/CI examples, and JSON-vector semantic search work. SQLite/FTS and in-process local embeddings remain future work.

Source of truth for intent and decisions (read before non-trivial work):
- `docs/decisions.md` — the locked-in decisions **and their rationale** (language, local-first product scope, auth model, deployment profiles, transports).
- `docs/roadmap.md` — what each step does; what is deliberately deferred.
- `docs/architecture.md` — full layered design, `NormalizedMemo` shape, all config keys.

## Commands

```bash
npm install          # install deps
npm run dev          # run in stdio mode with tsx watch
npm run dev:http     # run in HTTP mode (sets MEMOS_MCP_TRANSPORT=http)
npm run typecheck    # tsc --noEmit — run this after editing; it catches the SDK type contracts
npm test             # vitest run (all tests in tests/)
npm run build        # tsup bundle -> dist/index.js (adds node shebang)
npm run start        # node dist/index.js (requires build first)
npm run verify       # typecheck + tests + build
npm run smoke:http   # start local HTTP server and check /healthz
npm run smoke:memos  # check direct Memos API connectivity with env token
```

Run a single test file: `npx vitest run tests/normalize.test.ts`
Run tests matching a name: `npx vitest run -t "只读模式"`

Minimum env to run: `MEMOS_BASE_URL` (always) + `MEMOS_ACCESS_TOKEN` (stdio mode only). See `.env.example`.

## Architecture (the big picture)

Strict layered pipeline; each layer only knows the one below it:

```
src/index.ts                entry: loadConfig() -> startStdio() | startHttp()
  src/server/{stdio,http}.ts    transport; speaks MCP only, no Memos logic
    src/server/build-server.ts  builds an McpServer, wires auth resolver + tools
    src/server/register-tools.ts  PERMISSION GATE: registers tools per config
      src/tools/*.ts            each tool = a factory(deps) -> ToolDefinition
        src/auth/resolver.ts    resolves WHICH credential this call uses
          src/memos/client.ts   the ONLY place that talks to Memos REST
            src/memos/normalize.ts  Raw* -> Normalized* (version-drift firewall)
```

Cross-cutting ideas that require reading multiple files:

- **Credential source is an abstraction (`src/auth/resolver.ts`) — this keeps local stdio and local HTTP consistent.** `EnvAuthResolver` (stdio, token from config) and `HttpHeaderAuthResolver` (local http, token from per-request `Authorization` header) both produce `{baseUrl, token}` and a ready `MemosClient`. The server stores no tokens. Do not extend this into an author-hosted multi-user gateway.

- **`MemosClient` is per-call, not a singleton.** It carries one `{baseUrl, token}`. In local HTTP mode a fresh client is resolved on every tool call from that request's header. Do not introduce a shared/global client.

- **Normalization is the version-drift firewall (`src/memos/normalize.ts`).** Memos changes its API across versions (e.g. `content_search` filter syntax is gone in v0.24+, now `content.contains(...)`; `rowStatus`→`state`; bare id → `memos/{id}`). All such differences are absorbed here into `NormalizedMemo`; the rest of the code only sees the stable shape. When a Memos API call fails or returns unexpected fields, fix it here first.

- **Permission gating is centralized in `register-tools.ts`, not per-tool.** Each tool declares `isWrite`; optional tools can also declare `featureFlag`. When `config.readonly` is true, write tools are *not registered* (they vanish from `tools/list`), rather than rejected at call time. `memos_update` and `memos_archive` additionally require `MEMOS_MCP_ENABLE_UPDATE_TOOLS=true`. To add a tool: write a `createXxxTool(deps)` factory returning a `ToolDefinition`, then add it to `TOOL_FACTORIES`.

- **HTTP transport is stateless and local-first** (`sessionIdGenerator: undefined`): every POST `/mcp` builds a fresh `McpServer` + transport and closes them on response end. `buildServer` must stay pure (no cross-request state). HTTP is for localhost/LAN/private deployment, not public cloud service.

- **Tool handlers never throw to the client.** They return `{content, isError:true}` via `fail()` (see `src/tools/format.ts`). `AuthError` / `MemosApiError` carry user-facing Chinese messages.

## Non-Negotiable Constraints

From `docs/decisions.md`. Do not quietly violate:

- **No private/personal hard-coding.** No specific domains, tokens, or paths in code — everything user-specific goes through config.
- **No author-hosted cloud service.** Do not add public multi-user gateway assumptions, hosted token storage, or hosted vector index storage.
- **Conservative defaults.** `memos_create` requires explicit `visibility`; HTTP binds `127.0.0.1` (warn if bound elsewhere); global read-only mode exists.
- **Destructive tools are not implemented in this release.** Don't add delete tools without an explicit opt-in design.
- **Never log secrets or memo content.** All logging goes through `src/logging/logger.ts` (writes to stderr so it never pollutes the stdio MCP channel); tokens are redacted to the `memos_pat_` prefix via `redactToken`.
- **Semantic search must stay optional.** The base server loads no SQLite, vector database, or local model runtime dependencies. Current semantic search uses `src/indexer/` with a JSON index and OpenAI-compatible embeddings; don't pull heavy deps into the base profile.

## Conventions

- ESM + `"type": "module"`, Node 20+. **All relative imports use the `.js` extension** (`./config/index.js`), SDK imports too (`@modelcontextprotocol/sdk/server/mcp.js`) — required by `moduleResolution: NodeNext`.
- Config is read **only** in `src/config/index.ts` (zod, strict, rejects invalid rather than silently defaulting). Add new env vars there.
- After non-trivial edits run `npm run typecheck` — the MCP SDK's tool-handler return type is strict (it requires the index signature on `ToolResult`).

## Roadmap (what's NOT built yet)

Step 1 done: `memos_list` / `memos_get` / `memos_search` / `memos_create`, time retrieval tools, tag tools, resource listing, permission-gated `memos_update` / `memos_archive`, local stdio + local HTTP, auth abstraction, normalization, permission gate.

Semantic search done: optional JSON vector index, OpenAI-compatible embeddings, `memos_sync_index`, `memos_index_status`, and semantic-by-default `memos_search` when enabled.

Not built (don't assume these exist): SQLite/FTS index, in-process local embedding provider, npm publishing, `.mcpb` packaging. Time/tag/resource tools intentionally aggregate locally over paginated memos for compatibility instead of relying on server-side filter syntax.

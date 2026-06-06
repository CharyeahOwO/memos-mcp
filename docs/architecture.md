# memos-mcp Architecture

## Purpose

`memos-mcp` is a local-first Model Context Protocol server for usememos/Memos.

The project exposes a user's own Memos instance to local AI clients as a reliable, searchable, and safely writable memory backend.

It supports two local deployment profiles:

| Profile | Description |
| --- | --- |
| Base local retrieval | Lightweight local MCP server that forwards tool calls to the Memos REST API. |
| Local retrieval + vector | Base local retrieval plus local SQLite cache, FTS, embeddings, and semantic search. |

## Non-Goals

- Do not provide an author-hosted cloud service.
- Do not build a public multi-user MCP gateway.
- Do not store user Memos tokens in a hosted service.
- Do not upload memo content, local indexes, or embedding cache to an author-controlled cloud.
- Do not make this a MuLing-only private script.
- Do not hard-code private domains, tokens, paths, or personal workflow assumptions.
- Do not expose destructive tools by default.
- Do not require semantic search just to run the base local retrieval profile.
- Do not require a public HTTP server for local usage.
- Do not implement SSE unless a concrete compatibility need appears later.

## High-Level Architecture

```text
Local AI Client
  │
  │ MCP
  ▼
Local MCP Transport Layer
  ├─ stdio
  └─ Streamable HTTP bound to localhost by default
  │
  ▼
Tool Registry / Permission Layer
  ├─ safe read tools
  ├─ safe create tools
  ├─ update tools gated by config
  └─ destructive tools gated by config
  │
  ▼
Application Services
  ├─ Memos API Service
  ├─ Time Search Service
  ├─ Keyword Search Service
  ├─ optional Semantic Search Service
  └─ optional Index Sync Service
  │
  ├──────────────► Memos Instance
  │
  ▼
Optional Local Storage / Index Layer
  ├─ SQLite memo cache
  ├─ SQLite FTS5 index
  ├─ embedding cache
  └─ vector search storage
```

The storage/index layer only exists in the local vector-enabled profile. The base profile should run without SQLite, embedding libraries, or model downloads.

## Deployment Profiles

### 1. Base Local Retrieval

This is the default profile.

Characteristics:

- Runs on the user's machine or private host.
- Uses stdio or localhost Streamable HTTP.
- Reads/writes through the user's own Memos REST API.
- Does not maintain a local memo cache or vector index.
- Keeps dependencies small and startup fast.

Primary tools:

- `memos_list`
- `memos_get`
- `memos_search`
- `memos_create`
- `memos_get_day`
- `memos_get_range`
- `memos_on_this_day`
- `memos_get_by_tag`
- `tags_list`
- `resources_list`

### 2. Local Retrieval + Vector

This profile is explicitly enabled by configuration.

Characteristics:

- Runs on the user's machine or private host.
- Maintains local SQLite cache and indexes.
- Supports FTS keyword search over the local cache.
- Supports semantic search through local or OpenAI-compatible embedding providers.
- Stores all index and embedding data locally.

Additional tools:

- `memos_sync_index`
- `memos_index_status`
- `memos_semantic_search`

Isolation rule:

- The index is designed for a single local user/profile by default.
- If the same machine needs multiple Memos accounts, run multiple memos-mcp instances with different `MEMOS_MCP_INDEX_DB` paths.

## Layers

### 1. Local MCP Transport Layer

Required:

- `stdio` for local desktop clients and CLI-first users.
- `streamable-http` for local HTTP-capable MCP clients, Docker, service managers, or LAN-only private setups.

Not planned:

- `sse`, unless a concrete older-client compatibility requirement appears.
- public cloud gateway transport.

The transport layer should only handle MCP protocol concerns and should not contain Memos-specific business logic.

### 2. Tool Registry and Permission Layer

Tools should be registered based on config.

Safe tools can be enabled by default:

- list
- get
- keyword search
- time search
- tag search
- resource listing
- create memo

Vector-profile tools are enabled only when their dependencies/config are available:

- sync index
- index status
- semantic search

Risky tools should be permission-gated:

- update
- archive
- upload resource
- rename tag

Destructive tools should be disabled by default:

- delete memo
- delete resource

This layer should enforce read-only mode globally.

### 3. Local Auth / Credential Layer

Credential handling is local-only.

Sources:

- stdio: `MEMOS_ACCESS_TOKEN` from environment variables.
- local HTTP: `Authorization: Bearer <token>` from each request.

Boundaries:

- Do not design this as a hosted token broker.
- Do not log tokens.
- Do not write tokens to disk.
- Do not promise safe public multi-user hosting.

### 4. Memos API Client Layer

The client should wrap the Memos HTTP REST API.

Responsibilities:

- Authentication.
- Request/response handling.
- Error normalization.
- Pagination.
- Memos API version compatibility.
- Stable internal memo normalization.

Internal memo shape should be stable even if upstream API details differ.

Suggested normalized memo record:

```ts
interface NormalizedMemo {
  id: string;
  name: string;
  content: string;
  visibility?: string;
  creator?: string;
  tags: string[];
  pinned?: boolean;
  state?: string;
  createdAt: string;
  updatedAt?: string;
  resources?: NormalizedResource[];
  raw?: unknown;
}
```

### 5. Time Search Layer

Time search must be first-class, not a prompt hack.

Required tools:

- `memos_get_day(date, timezone?)`
- `memos_get_range(start_date, end_date, timezone?)`
- `memos_on_this_day(month?, day?, timezone?)`

Rules:

- Date calculations must be timezone-aware.
- Default timezone should be configurable.
- API timestamps should be normalized before comparison.
- Range boundaries should be documented clearly.

### 6. Keyword Search Layer

Keyword search should support two sources:

1. Memos native API search/filter in the base local retrieval profile.
2. Local SQLite FTS5 index in the vector-enabled profile.

Local FTS is useful for stable, fast, local search behavior, but it must not be required for basic usage.

### 7. Semantic Search Layer

Semantic search is optional and only belongs to the local vector-enabled profile.

Supported provider modes:

```text
disabled
local
openai-compatible
```

#### `disabled`

No embedding dependencies. Basic users can run the server without semantic features.

#### `local`

Use a local embedding model.

Potential TypeScript option:

```text
@xenova/transformers
Xenova/all-MiniLM-L6-v2
```

Benefits:

- No external embedding API key.
- Better privacy.
- Works for local-only users.

Tradeoffs:

- Heavier install/runtime.
- Model download/cache handling required.

#### `openai-compatible`

Use a configurable OpenAI-compatible embedding endpoint.

Configurable fields:

- base URL
- API key
- model

Benefits:

- Better embedding quality depending on backend.
- Easier to swap providers.

Tradeoffs:

- Requires an external service.
- Must avoid logging secrets.
- Memo content may leave the user's machine depending on the configured provider, so this must be explicit in docs.

### 8. Local Storage / Index Layer

Use SQLite as the local index database for the vector-enabled profile.

Suggested tables:

```text
memos
memo_tags
memo_resources
sync_state
embeddings
```

Indexes:

- created time index
- updated time index
- tag index
- FTS5 virtual table for content
- vector/embedding storage depending on implementation

The index layer should support:

- full sync
- incremental sync if Memos API allows
- rebuild index
- inspect status

### 9. Configuration Layer

Configuration should be environment-first with strict validation.

Important config keys:

```env
MEMOS_BASE_URL=
MEMOS_ACCESS_TOKEN=

MEMOS_MCP_TRANSPORT=stdio
MEMOS_MCP_HOST=127.0.0.1
MEMOS_MCP_PORT=8080
MEMOS_MCP_TIMEZONE=UTC

MEMOS_MCP_DEFAULT_VISIBILITY=PRIVATE
MEMOS_MCP_READONLY=false
MEMOS_MCP_ENABLE_UPDATE_TOOLS=false
MEMOS_MCP_ENABLE_DELETE_TOOLS=false
MEMOS_MCP_ENABLE_RESOURCE_TOOLS=false

MEMOS_MCP_INDEX_DB=./data/memos-mcp.sqlite
MEMOS_MCP_ENABLE_FTS=true
MEMOS_MCP_ENABLE_SEMANTIC_SEARCH=false

MEMOS_MCP_EMBEDDING_PROVIDER=disabled
MEMOS_MCP_EMBEDDING_MODEL=
MEMOS_MCP_EMBEDDING_BASE_URL=
MEMOS_MCP_EMBEDDING_API_KEY=
```

## Deployment Architecture

### Local stdio

Best for:

- Claude Desktop.
- Cursor / VS Code-style local MCP clients.
- simple personal usage.

### Local Streamable HTTP

Best for:

- local HTTP-capable MCP clients.
- Docker deployments on a private machine.
- service managers such as systemd or pm2.
- LAN-only private setups when the user explicitly wants them.

Default host should be `127.0.0.1` for safety.

### Docker

Docker should support persistent volume for:

- SQLite index.
- local embedding model cache.
- logs if any.

Docker is a packaging option for local/private deployment, not an author-hosted cloud service.

### Docker Compose

Compose should include:

- memos-mcp service.
- environment variables.
- persistent volume.
- optional network notes for connecting to Memos.

## Safety Model

Default behavior should be conservative:

- No author-hosted cloud service.
- No public multi-user gateway.
- HTTP binds to localhost.
- Default memo visibility is private.
- Read-only mode exists.
- Delete tools are disabled by default.
- Update tools are disabled or explicitly gated.
- Tokens are never logged.
- Debug logs should not dump memo content unless explicitly enabled.
- Vector indexes and embedding cache stay on the user's local filesystem.

## Suggested Repository Structure

```text
memos-mcp/
├── src/
│   ├── index.ts
│   ├── config/
│   ├── auth/
│   ├── logging/
│   ├── server/
│   │   ├── stdio.ts
│   │   ├── http.ts
│   │   └── register-tools.ts
│   ├── memos/
│   │   ├── client.ts
│   │   ├── types.ts
│   │   └── normalize.ts
│   ├── tools/
│   │   ├── list.ts
│   │   ├── get.ts
│   │   ├── create.ts
│   │   ├── search.ts
│   │   ├── time-search.ts
│   │   ├── tag.ts
│   │   ├── resources.ts
│   │   ├── semantic-search.ts
│   │   └── index-status.ts
│   ├── indexer/
│   │   ├── sqlite.ts
│   │   ├── sync.ts
│   │   ├── fts.ts
│   │   ├── embeddings.ts
│   │   └── vector-store.ts
│   └── cli/
│       ├── sync.ts
│       └── status.ts
├── docs/
├── examples/
├── docker/
├── tests/
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.example.yml
├── README.md
├── TODO.md
└── LICENSE
```

## Tech Stack

Current choice:

- Runtime: Node.js 20/22+
- Language: TypeScript
- MCP SDK: `@modelcontextprotocol/sdk`
- HTTP server: Express for the current implementation
- Config validation: Zod
- Database: SQLite via `better-sqlite3` or equivalent when vector indexing is added
- Test runner: Vitest
- Build: tsup
- Lint/format: ESLint + Prettier
- Local embeddings: candidate `@xenova/transformers`
- Package distribution: npm
- Container distribution: Docker / GHCR

## Documentation Requirements

The project should include:

```text
docs/quick-start.md
docs/configuration.md
docs/transports.md
docs/tools.md
docs/semantic-search.md
docs/docker.md
docs/security.md
docs/memos-api-compatibility.md
docs/development.md
examples/claude-desktop.json
examples/cursor.json
examples/vscode.json
examples/hermes.yaml
examples/docker-compose.yaml
```

## Open Questions

- How broad should Memos version compatibility be?
- Should semantic search use a local embedding provider by default when explicitly enabled, or require provider selection?
- Should update/archive tools be enabled by config or left for a later release?
- Whether resource upload belongs in the default tool surface.
- Whether semantic index should sync automatically by default or only through explicit tool calls.

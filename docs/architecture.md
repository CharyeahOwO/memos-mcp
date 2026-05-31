# memos-mcp Architecture

## Purpose

`memos-mcp` is a Model Context Protocol server for usememos/Memos.

The project should expose Memos as a reliable, searchable, and safely writable memory backend for AI clients.

It should support normal note operations, time-based retrieval, semantic search, and multiple deployment modes.

## Non-Goals

- Do not make this a MuLing-only private script.
- Do not hard-code private domains, tokens, or personal workflow assumptions.
- Do not expose destructive tools by default.
- Do not require semantic search just to run basic Memos tools.
- Do not require a public HTTP server for local usage.

## High-Level Architecture

```text
AI Client
  │
  │ MCP
  ▼
MCP Transport Layer
  ├─ stdio
  ├─ Streamable HTTP
  └─ optional SSE compatibility
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
  ├─ Semantic Search Service
  └─ Index Sync Service
  │
  ▼
Storage / Index Layer
  ├─ SQLite memo cache
  ├─ SQLite FTS5 index
  ├─ embedding cache
  └─ vector search storage
  │
  ▼
Memos Instance
```

## Layers

### 1. MCP Transport Layer

The server should support multiple transports.

Required:

- `stdio` for local desktop clients and CLI-first users.
- `streamable-http` for modern remote/local HTTP MCP clients.

Optional:

- `sse` if compatibility with older clients is useful.

The transport layer should only handle MCP protocol concerns and should not contain Memos-specific business logic.

### 2. Tool Registry and Permission Layer

Tools should be registered based on config.

Safe tools can be enabled by default:

- list
- get
- keyword search
- time search
- semantic search if configured
- create memo
- sync index
- index status

Risky tools should be permission-gated:

- update
- archive
- upload resource
- rename tag

Destructive tools should be disabled by default:

- delete memo
- delete resource

This layer should enforce read-only mode globally.

### 3. Memos API Client Layer

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

### 4. Time Search Layer

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

### 5. Keyword Search Layer

Keyword search should support two sources:

1. Memos native API search/filter if available.
2. Local SQLite FTS5 index.

Local FTS is useful for stable, fast, offline-ish search behavior.

### 6. Semantic Search Layer

Semantic search should be optional but designed as a core feature.

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

Use configurable OpenAI-compatible embedding endpoint.

Configurable fields:

- base URL
- API key
- model

Benefits:

- Better embedding quality depending on backend.
- Easier to swap providers.

Tradeoffs:

- Requires external service.
- Must avoid logging secrets.

### 7. Storage / Index Layer

Use SQLite as the local index database.

Suggested tables:

```text
memos
memo_tags
memo_resources
sync_state
embeddings
```

Indexes:

- created time index.
- updated time index.
- tag index.
- FTS5 virtual table for content.
- vector/embedding storage depending on implementation.

The index layer should support:

- full sync.
- incremental sync if Memos API allows.
- rebuild index.
- inspect status.

### 8. Configuration Layer

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
- local MCP clients.
- simple personal usage.

### HTTP / Streamable HTTP

Best for:

- Hermes/OpenClaw.
- remote MCP clients.
- Docker deployments.
- shared local services.

Default host should be `127.0.0.1` for safety.

### Docker

Docker should support persistent volume for:

- SQLite index.
- local embedding model cache.
- logs if any.

### Docker Compose

Compose should include:

- memos-mcp service.
- environment variables.
- persistent volume.
- optional network notes for connecting to Memos.

## Safety Model

Default behavior should be conservative:

- HTTP binds to localhost.
- Default memo visibility is private.
- Read-only mode exists.
- Delete tools are disabled by default.
- Update tools are disabled or explicitly gated.
- Tokens are never logged.
- Debug logs should not dump memo content unless explicitly enabled.

## Suggested Repository Structure

If TypeScript is chosen:

```text
memos-mcp/
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── permissions.ts
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

## Candidate Tech Stack

TypeScript is currently only the leading candidate, not a final decision. The final choice should be based on MCP ecosystem fit, install experience, semantic-search dependencies, deployment complexity, and maintainability.

Recommended if TypeScript is chosen:

- Runtime: Node.js 20/22+
- MCP SDK: `@modelcontextprotocol/sdk`
- HTTP server: Hono or Express
- Config validation: Zod
- Database: SQLite via `better-sqlite3`
- Test runner: Vitest
- Build: tsup
- Lint/format: ESLint + Prettier
- Local embeddings: `@xenova/transformers`
- Package distribution: npm
- Container distribution: Docker / GHCR

## Documentation Requirements

The public project should include:

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

- Should the first implementation fork an existing Memos MCP project or start clean?
- Should TypeScript be chosen for npm/npx ergonomics, or Python for FastMCP simplicity?
- Should semantic search use local embeddings by default, or be disabled by default?
- Should update/archive tools be enabled by default or opt-in only?
- Should resource upload be included in the public default tool surface?
- Should the project include a Web admin dashboard, or stay CLI/config-only?
- How broad should Memos version compatibility be?

# Contributing

Thanks for helping improve memos-mcp. Keep changes local-first, small enough to review, and safe by default.

## Development Setup

```bash
npm install
npm run verify
```

For local HTTP smoke testing:

```bash
npm run build
npm run smoke:http
npm run smoke:stdio
```

For real Memos API connectivity:

```bash
set MEMOS_BASE_URL=https://memos.example.com
set MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx
npm run smoke:memos
```

To also test create/update/archive against a disposable or test Memos instance:

```bash
set MEMOS_MCP_SMOKE_WRITE=true
npm run smoke:memos
```

## Project Boundaries

- Do not add an author-hosted cloud service or public multi-user gateway.
- Do not commit real Memos tokens, `.env`, local SQLite databases, logs, or embedding caches.
- Keep destructive tools out of the default tool surface.
- Keep semantic search local-first: the vector index is required, stored locally, and backed by an OpenAI-compatible embedding endpoint.
- Add or update tests and docs when changing tool behavior.

## Pull Request Checklist

- `npm run verify` passes.
- `npm run smoke:http` passes after a build.
- `npm run smoke:stdio` passes after a build.
- New config keys are added to `.env.example` and README.
- New tools are added to README and registration tests.
- No real secrets or private domains are included.

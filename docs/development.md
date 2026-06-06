# Development

## Install

```bash
npm install
```

## Run

stdio watch mode:

```bash
npm run dev
```

HTTP mode:

```bash
set MEMOS_MCP_TRANSPORT=http
set MEMOS_BASE_URL=http://127.0.0.1:5230
npm run dev:http
```

## Validate

```bash
npm run typecheck
npm test
npm run build
npm run validate:examples
npm run smoke:http
```

Combined check:

```bash
npm run verify
```

## Real Memos Smoke Test

```bash
set MEMOS_BASE_URL=https://memos.example.com
set MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx
npm run smoke:memos
```

Write-path smoke test against a disposable/test Memos instance:

```bash
set MEMOS_MCP_SMOKE_WRITE=true
npm run smoke:memos
```

This creates a private smoke memo, updates it, and archives it.

## Add A Tool

1. Add `src/tools/<name>.ts` exporting a `createXxxTool(deps)` factory.
2. Return a `ToolDefinition`.
3. Add the factory to `TOOL_FACTORIES` in `src/server/register-tools.ts`.
4. Add tests.
5. Update `docs/tools.md` and README.

Tool handlers should return `ok(...)` or `fail(...)`; do not throw user-facing errors to the MCP client.

## Deployment Docs

- `docs/deployment.md` covers native service, systemd, pm2, and reverse proxy notes.
- `docs/troubleshooting.md` covers common startup and client integration failures.

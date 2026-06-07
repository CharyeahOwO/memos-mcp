# Development

## Commands

```bash
npm install
npm run dev
npm run dev:http
npm run typecheck
npm test
npm run build
npm run validate:repo
npm run validate:docker
npm run smoke:http
npm run smoke:stdio
```

Full local verification:

```bash
npm run verify
```

Real Memos read smoke:

```bash
set MEMOS_BASE_URL=https://memos.example.com
set MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx
npm run smoke:memos
```

Disposable write smoke:

```bash
set MEMOS_MCP_SMOKE_WRITE=true
npm run smoke:memos
```

This creates, updates, and archives one private smoke memo.

## Add A Tool

1. Add `src/tools/<name>.ts` exporting a `createXxxTool(deps)` factory.
2. Return a `ToolDefinition`.
3. Add the factory to `TOOL_FACTORIES` in `src/server/register-tools.ts`.
4. Add tests.
5. Update README if the public tool surface changes.

Tool handlers should return `ok(...)` or `fail(...)`; do not throw user-facing errors to the MCP client.

## Release Hygiene

- Do not commit `.env`, real PATs, memo content dumps, `dist/`, `node_modules/`, `data/`, logs, or local indexes.
- Use README for user-facing setup examples.
- Keep docs limited to architecture, deployment, development, and semantic search.

## Release Checklist

Run these checks before tagging a release:

```bash
npm run verify
npm run smoke:http
npm run smoke:stdio
npm run validate:docker
npm pack --dry-run --json
docker compose -f docker-compose.example.yml config
```

Run the real Memos smoke only with a disposable or trusted Memos token:

```bash
set MEMOS_BASE_URL=https://memos.example.com
set MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx
npm run smoke:memos
```

Release metadata:

- npm package name is `@charyeahowo/memos-mcp`; the CLI binary remains `memos-mcp`.
- Use semver tags such as `v0.1.0`.
- Confirm GitHub Actions CI is green on the release commit.
- Confirm GHCR image tags are available after the tag workflow completes.
- Release notes should cover user-facing tool changes, deployment changes, compatibility notes, and known limitations.

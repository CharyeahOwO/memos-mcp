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
npm publish --dry-run --access public
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
- The unscoped npm package name `memos-mcp` is already occupied, so do not publish or document unscoped npm install commands for this project.
- Confirm the scoped package is still unpublished or at the expected version:

```bash
npm view @charyeahowo/memos-mcp version --registry=https://registry.npmjs.org
```

- Use semver git tags such as `v0.1.0`; the Docker workflow publishes GHCR semver tags from `v*.*.*`.
- Confirm GitHub Actions CI is green on the release commit.
- After pushing the tag, confirm GHCR image tags are available:

```bash
docker manifest inspect ghcr.io/charyeahowo/memos-mcp:0.1.0
docker manifest inspect ghcr.io/charyeahowo/memos-mcp:0.1
```

- If publishing npm manually, use:

```bash
npm publish --access public --provenance
```

Release notes should include:

- Tool surface changes, including semantic-by-default `memos_search`, read/write tool visibility, and update/archive feature flags.
- Transport validation for stdio and Streamable HTTP.
- Docker/GHCR image tag and Compose health check notes.
- Memos v0.24+ compatibility notes and any real `smoke:memos` result.
- Known limitations, especially that the local JSON vector index is a single-user lightweight cache.

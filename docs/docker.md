# Docker

This project supports Docker for local/private deployment. It is not an author-hosted cloud service.

## Build Locally

```bash
docker build -t memos-mcp:local .
```

The current machine used during development does not have Docker installed; the Docker image is therefore validated by GitHub Actions.

## Run Locally

The container runs the Streamable HTTP transport. It binds to `0.0.0.0` inside the container, while the host port should stay bound to `127.0.0.1`.

```bash
docker run --rm \
  --name memos-mcp \
  -e MEMOS_BASE_URL=http://host.docker.internal:5230 \
  -e MEMOS_MCP_TRANSPORT=http \
  -e MEMOS_MCP_HOST=0.0.0.0 \
  -e MEMOS_MCP_PORT=8080 \
  -e MEMOS_MCP_ENABLE_UPDATE_TOOLS=false \
  -p 127.0.0.1:8080:8080 \
  memos-mcp:local
```

HTTP clients must send the user's Memos token per request:

```http
Authorization: Bearer memos_pat_xxxxxxxx
```

## Docker Compose

Use the example file:

```bash
copy docker-compose.example.yml docker-compose.yml
docker compose up -d --build
```

On Linux, `host.docker.internal` is enabled through `extra_hosts: host-gateway` in the example. On Docker Desktop, it is available by default.

## Health Check

```bash
curl http://127.0.0.1:8080/healthz
```

Expected response:

```json
{"ok":true}
```

## Published Images

The GitHub Actions workflow publishes images to GitHub Container Registry on pushes to `main` and version tags:

```text
ghcr.io/charyeahowo/memos-mcp:main
ghcr.io/charyeahowo/memos-mcp:v0.1.0
ghcr.io/charyeahowo/memos-mcp:0.1
```

Pull request builds validate the Dockerfile but do not push images.

## Security Notes

- Keep host port publishing on `127.0.0.1` unless you explicitly need LAN access.
- Do not publish this container directly to the public internet.
- Do not bake `MEMOS_ACCESS_TOKEN` into the image.
- The semantic profile should mount `MEMOS_MCP_INDEX_DB` into a local volume, for example `/app/data/memos-mcp-index.json`.

For non-container deployment, see [`deployment.md`](./deployment.md). For common failures, see [`troubleshooting.md`](./troubleshooting.md).

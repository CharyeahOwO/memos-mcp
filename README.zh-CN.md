# memos-mcp

[English](./README.md) | **简体中文**

[![CI](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/ci.yml)
[![Docker Image](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/docker-image.yml/badge.svg)](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/docker-image.yml)

面向 [Memos](https://github.com/usememos/memos) 的本地优先 [Model Context Protocol](https://modelcontextprotocol.io) 服务器。它把你的 Memos 实例变成本地 AI 客户端可搜索、可安全写入的记忆后端。

不提供作者云服务。不做公网多用户网关。Token 和索引数据都留在你的本地或私有环境。

## 支持范围

客户端与运行方式：

| 客户端 / 运行方式 | 传输 | 状态 |
| --- | --- | --- |
| Claude Desktop | stdio | 支持 |
| Cursor | stdio | 支持 |
| VS Code Copilot MCP | stdio | 支持 |
| Codex CLI | stdio | 支持 |
| Hermes Agent | Streamable HTTP | 支持 |
| OpenClaw | Streamable HTTP | 支持 |
| systemd / pm2 | HTTP 本地服务 | 支持 |
| Docker Compose | HTTP 本地服务 | 支持 |

部署形态：

| 形态 | 说明 |
| --- | --- |
| 本地检索版 | 直接转发 MCP 工具调用到 Memos API，不创建本地索引。 |
| 本地检索 + 语义搜索 | 增加本地 JSON 向量索引；同步后 `memos_search` 默认走语义搜索。 |

## 安装

```bash
git clone https://github.com/CharyeahOwO/memos-mcp.git
cd memos-mcp
npm install
cp .env.example .env
npm run build
```

最小配置：

```env
MEMOS_BASE_URL=https://memos.example.com
MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx
MEMOS_MCP_TRANSPORT=stdio
```

## 运行

### stdio

适合由 MCP 客户端直接启动本地进程。

```bash
MEMOS_BASE_URL=https://memos.example.com \
MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx \
npm run start
```

### 本地 Streamable HTTP

适合作为本机服务运行。客户端在请求头里发送 Memos token。

```bash
MEMOS_MCP_TRANSPORT=http \
MEMOS_BASE_URL=https://memos.example.com \
npm run start
```

MCP endpoint：`http://127.0.0.1:8080/mcp`

健康检查：`http://127.0.0.1:8080/healthz`

### 语义搜索

```bash
MEMOS_MCP_ENABLE_SEMANTIC_SEARCH=true \
MEMOS_MCP_INDEX_DB=./data/memos-mcp-index.json \
MEMOS_MCP_EMBEDDING_PROVIDER=openai-compatible \
MEMOS_MCP_EMBEDDING_BASE_URL=http://127.0.0.1:11434/v1 \
MEMOS_MCP_EMBEDDING_MODEL=nomic-embed-text \
MEMOS_BASE_URL=https://memos.example.com \
MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx \
npm run start
```

接入 MCP 客户端后：

1. 调用 `memos_sync_index` 构建或刷新索引。
2. 调用 `memos_index_status` 确认索引就绪。
3. 正常调用 `memos_search`；开启语义搜索后 `mode: "auto"` 默认就是语义。
4. 需要关键词搜索时传 `mode: "keyword"`。

## 客户端配置

把 `/absolute/path/to/memos-mcp` 换成你的本地路径。

### Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "memos": {
      "command": "node",
      "args": ["/absolute/path/to/memos-mcp/dist/index.js"],
      "env": {
        "MEMOS_BASE_URL": "https://memos.example.com",
        "MEMOS_ACCESS_TOKEN": "memos_pat_xxxxxxxx"
      }
    }
  }
}
```

### VS Code Copilot MCP

```json
{
  "servers": {
    "memos": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/memos-mcp/dist/index.js"],
      "env": {
        "MEMOS_BASE_URL": "https://memos.example.com",
        "MEMOS_ACCESS_TOKEN": "memos_pat_xxxxxxxx"
      }
    }
  }
}
```

### Codex CLI

```toml
[mcp_servers.memos]
command = "node"
args = ["/absolute/path/to/memos-mcp/dist/index.js"]

[mcp_servers.memos.env]
MEMOS_BASE_URL = "https://memos.example.com"
MEMOS_ACCESS_TOKEN = "memos_pat_xxxxxxxx"
```

### 通用 Streamable HTTP

```json
{
  "mcpServers": {
    "memos": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:8080/mcp",
      "headers": {
        "Authorization": "Bearer memos_pat_xxxxxxxx"
      }
    }
  }
}
```

### Hermes Agent

```yaml
mcp_servers:
  memos:
    url: "http://127.0.0.1:8080/mcp"
    headers:
      Authorization: "Bearer memos_pat_xxxxxxxx"
    connect_timeout: 10
    timeout: 60
    enabled: true
```

### OpenClaw

```yaml
mcp:
  servers:
    memos:
      url: "http://127.0.0.1:8080/mcp"
      transport: "streamable-http"
      connectionTimeoutMs: 10000
      headers:
        Authorization: "Bearer memos_pat_xxxxxxxx"
```

CLI 写法：

```bash
openclaw mcp set memos '{"url":"http://127.0.0.1:8080/mcp","transport":"streamable-http","headers":{"Authorization":"Bearer memos_pat_xxxxxxxx"}}'
```

## 部署

### Docker Compose

```yaml
services:
  memos-mcp:
    image: ghcr.io/charyeahowo/memos-mcp:main
    restart: unless-stopped
    environment:
      MEMOS_BASE_URL: http://host.docker.internal:5230
      MEMOS_MCP_TRANSPORT: http
      MEMOS_MCP_HOST: 0.0.0.0
      MEMOS_MCP_PORT: 8080
      MEMOS_MCP_READONLY: "false"
      MEMOS_MCP_ENABLE_UPDATE_TOOLS: "false"
    ports:
      - "127.0.0.1:8080:8080"
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Docker 构建由 GitHub Actions 验证；当前开发机不需要安装 Docker。

### systemd

```ini
[Unit]
Description=memos-mcp
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/memos-mcp
EnvironmentFile=/etc/memos-mcp/memos-mcp.env
ExecStart=/usr/bin/node /opt/memos-mcp/dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

环境文件：

```env
MEMOS_BASE_URL=http://127.0.0.1:5230
MEMOS_MCP_TRANSPORT=http
MEMOS_MCP_HOST=127.0.0.1
MEMOS_MCP_PORT=8080
```

### pm2

```js
module.exports = {
  apps: [
    {
      name: "memos-mcp",
      script: "dist/index.js",
      env: {
        MEMOS_BASE_URL: "http://127.0.0.1:5230",
        MEMOS_MCP_TRANSPORT: "http",
        MEMOS_MCP_HOST: "127.0.0.1",
        MEMOS_MCP_PORT: "8080"
      }
    }
  ]
};
```

## 工具

| 工具 | 类型 | 说明 |
| --- | --- | --- |
| `memos_list` | 读 | 列出最近笔记 |
| `memos_get` | 读 | 按 id 或 `memos/{id}` 获取笔记 |
| `memos_search` | 读 | 开启语义时默认语义搜索，否则关键词搜索 |
| `memos_get_day` | 读 | 按时区查询某天笔记 |
| `memos_get_range` | 读 | 按时区查询日期范围 |
| `memos_on_this_day` | 读 | 那年今日 |
| `memos_get_by_tag` | 读 | 按标签查询 |
| `tags_list` | 读 | 本地聚合标签 |
| `resources_list` | 读 | 本地聚合附件资源 |
| `memos_create` | 写 | 必须显式选择 `PRIVATE` / `PROTECTED` / `PUBLIC` |
| `memos_update` | 写 | 需 `MEMOS_MCP_ENABLE_UPDATE_TOOLS=true` |
| `memos_archive` | 写 | 需 `MEMOS_MCP_ENABLE_UPDATE_TOOLS=true` |
| `memos_sync_index` | 读 | 仅语义搜索模式 |
| `memos_index_status` | 读 | 仅语义搜索模式 |

当 `MEMOS_MCP_READONLY=true` 时，所有写工具都会从 `tools/list` 中隐藏。

## 配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MEMOS_BASE_URL` | 必填 | Memos 实例地址 |
| `MEMOS_ACCESS_TOKEN` | stdio 必填 | HTTP 模式可由客户端请求头提供 |
| `MEMOS_MCP_TRANSPORT` | `stdio` | `stdio` 或 `http` |
| `MEMOS_MCP_HOST` | `127.0.0.1` | HTTP 绑定地址 |
| `MEMOS_MCP_PORT` | `8080` | HTTP 端口 |
| `MEMOS_MCP_READONLY` | `false` | 隐藏写工具 |
| `MEMOS_MCP_ENABLE_UPDATE_TOOLS` | `false` | 启用 update/archive |
| `MEMOS_MCP_TIMEZONE` | `UTC` | IANA 时区 |
| `MEMOS_MCP_ENABLE_SEMANTIC_SEARCH` | `false` | 启用语义索引工具，并让搜索默认语义 |
| `MEMOS_MCP_INDEX_DB` | `./data/memos-mcp-index.json` | 本地 JSON 向量索引 |
| `MEMOS_MCP_EMBEDDING_PROVIDER` | `disabled` | `disabled` 或 `openai-compatible` |
| `MEMOS_MCP_EMBEDDING_BASE_URL` | 未设置 | OpenAI-compatible base URL |
| `MEMOS_MCP_EMBEDDING_MODEL` | 未设置 | embedding 模型 |
| `MEMOS_MCP_EMBEDDING_API_KEY` | 未设置 | 可选 embedding API key |
| `MEMOS_MCP_EMBEDDING_BATCH_SIZE` | `32` | 1-128 |

## 开发

```bash
npm run typecheck
npm test
npm run build
npm run validate:repo
npm run smoke:http
```

完整检查：

```bash
npm run verify
```

GitHub Actions 会在 Node.js 20 和 22 上运行 CI，并在 `main` 或版本标签上构建/推送 GHCR Docker 镜像。

## 更多文档

- [Architecture](./docs/architecture.md)
- [Deployment](./docs/deployment.md)
- [Development](./docs/development.md)
- [Semantic Search](./docs/semantic-search.md)

## 许可证

[MIT](./LICENSE) © CharyeahOwO

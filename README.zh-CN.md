# memos-mcp

[English](./README.md) | **简体中文**

[![CI](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/ci.yml)
[![Docker Image](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/docker-image.yml/badge.svg)](https://github.com/CharyeahOwO/memos-mcp/actions/workflows/docker-image.yml)
一个面向 [Memos](https://github.com/usememos/memos) 的 [Model Context Protocol](https://modelcontextprotocol.io) 服务器——把你的 Memos 实例变成 AI 客户端可搜索、可安全写入的记忆后端。

> **状态：** 早期开发中（`v0.1.0`）。核心读写工具、可选语义搜索、本地 stdio/HTTP 传输、Docker 打包、CI 与原生服务示例已具备。

`memos-mcp` 的定位是一个**本地优先、生产级的工具**，而非个人临时脚本，也不再定位为云端托管服务。项目支持两种部署形态：轻量的本地检索服务，以及“本地检索 + 可选向量/语义索引”的增强版。

## 功能特性

- **核心笔记工具** —— 列出、获取、新建、关键词搜索、时间检索、标签检索和附件元数据列表。
- **两种本地传输方式** —— `stdio`（本地桌面客户端，如 Claude Desktop、Cursor 等）与 **Streamable HTTP**（本机 HTTP 型 MCP 客户端）。
- **本地凭据处理** —— stdio 模式从环境变量读取 token；本地 HTTP 模式可由客户端在每个请求中提供 `Authorization: Bearer <token>`。服务器不再定位为公网多用户网关。
- **默认安全** —— 本版本不实现破坏性工具；更新/归档工具默认关闭；全局只读模式可隐藏所有写工具；`memos_create` 必须显式选择可见性；HTTP 服务器默认绑定 `127.0.0.1`。
- **抗版本漂移** —— 上游 Memos 响应会被归一化成稳定的内部结构，把 Memos API 跨版本的差异隔离在一处。
- **可选语义搜索** —— 开启后，`memos_search` 默认使用本地语义索引；索引由 OpenAI-compatible embedding 生成并保存在本地 JSON 文件中。
- **基础版低依赖** —— 基础服务器不加载 SQLite、嵌入库或向量数据库。语义搜索只在配置开启后使用。

## 支持的客户端

仓库已提供以下可复制配置：

| 客户端 / 运行方式 | 推荐传输 | 示例 |
| --- | --- | --- |
| Claude Desktop | stdio | [`examples/claude-desktop.json`](./examples/claude-desktop.json) |
| Cursor | stdio | [`examples/cursor.json`](./examples/cursor.json) |
| VS Code Copilot MCP | stdio | [`examples/vscode.json`](./examples/vscode.json) |
| Codex CLI | stdio | [`examples/codex.toml`](./examples/codex.toml) |
| Hermes Agent | 本地 Streamable HTTP | [`examples/hermes.yaml`](./examples/hermes.yaml) |
| OpenClaw | 本地 Streamable HTTP | [`examples/openclaw.yaml`](./examples/openclaw.yaml) |
| systemd 服务 | 本地 Streamable HTTP | [`examples/memos-mcp.service`](./examples/memos-mcp.service) |
| pm2 服务 | 本地 Streamable HTTP | [`examples/pm2.config.cjs`](./examples/pm2.config.cjs) |
| Docker Compose | 本地 Streamable HTTP | [`docker-compose.example.yml`](./docker-compose.example.yml) |

其它 MCP 客户端只要支持 stdio 启动本地服务，或支持连接 `/mcp` 的 Streamable HTTP，一般也能接入。

## 环境要求

- Node.js **20+**
- 一个可访问的 [Memos](https://github.com/usememos/memos) 实例（推荐 v0.24+）
- 一个 Memos **Personal Access Token**（设置 → Access Tokens，格式 `memos_pat_…`）

## 快速开始

```bash
git clone https://github.com/CharyeahOwO/memos-mcp.git
cd memos-mcp
npm install
cp .env.example .env   # 然后编辑 .env
npm run build
```

## 部署方式

### 1. 本地检索版（基础版）

适合想轻量接入 AI 客户端的场景。服务只转发到你的 Memos 实例，不创建本地索引。

#### stdio

适用于本地桌面 MCP 客户端。服务器使用环境变量里的单个 token。

```bash
MEMOS_BASE_URL=https://memos.example.com \
MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx \
npm run start
```

开发时可用 `npm run dev`（监听模式），无需先构建。

#### 本地 Streamable HTTP

适用于支持 HTTP 的本地 MCP 客户端。本地客户端在每个请求里发送 `Authorization: Bearer <token>`。

```bash
MEMOS_MCP_TRANSPORT=http \
MEMOS_BASE_URL=https://memos.example.com \
npm run start
```

服务器监听 `http://127.0.0.1:8080/mcp`，健康检查在 `/healthz`。

> **本地部署定位：** 本项目不再面向作者提供云服务或公网托管服务。除非你明确需要局域网访问，否则保持绑定 `127.0.0.1`；不要直接暴露到公网。

原生服务部署见 [`docs/deployment.md`](./docs/deployment.md)。Docker 与 Compose 见 [`docs/docker.md`](./docs/docker.md)。本开发机不需要安装 Docker，Docker 构建交给 GitHub Actions 验证。

### 2. 本地检索 + 语义搜索版

适合希望 `memos_search` 按语义检索，而不是只做关键词匹配的场景。索引保存在你的本地文件系统，需要一个 OpenAI-compatible embeddings endpoint。

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

1. 先调用 `memos_sync_index` 构建或刷新本地索引。
2. 再调用 `memos_index_status` 确认索引已就绪。
3. 正常调用 `memos_search`；启用语义搜索后，`mode: "auto"` 默认就是语义检索。
4. 如果只想走 Memos 原生关键词搜索，传 `mode: "keyword"`。

## 客户端配置

主流 MCP 客户端通常支持两种配置形态：

- **stdio**：客户端启动 `node dist/index.js`，并通过环境变量传入配置。
- **Streamable HTTP**：`memos-mcp` 作为本地 HTTP 服务运行，客户端连接 `http://127.0.0.1:8080/mcp` 并带 `Authorization` 请求头。

### stdio（例如 Claude Desktop）

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

### HTTP（本地客户端）

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

更多可复制示例在 [`examples/`](./examples)，包括 Claude Desktop、Cursor、VS Code、Codex CLI、Hermes Agent、OpenClaw、systemd、pm2 和 Docker Compose。

## 工具

| 工具 | 说明 | 类型 |
| --- | --- | --- |
| `memos_list` | 列出最近的笔记（按时间倒序），支持翻页。 | 读 |
| `memos_get` | 按 id 或资源名（`memos/123`）获取单条笔记。 | 读 |
| `memos_search` | 搜索笔记。开启语义索引时默认走语义搜索；否则走 Memos 原生关键词匹配。 | 读 |
| `memos_get_day` | 按指定时区中的某个日历日获取笔记。 | 读 |
| `memos_get_range` | 按包含起止日期的时间范围获取笔记。 | 读 |
| `memos_on_this_day` | 获取历史上同月同日的“那年今日”笔记。 | 读 |
| `memos_get_by_tag` | 按标签获取笔记。 | 读 |
| `tags_list` | 扫描笔记并列出标签及数量。 | 读 |
| `resources_list` | 扫描笔记并列出附件/资源元数据。 | 读 |
| `memos_create` | 新建笔记。模型必须显式选择 `PRIVATE` / `PROTECTED` / `PUBLIC`。 | 写 |
| `memos_update` | 更新内容、可见性、置顶状态或笔记状态。默认关闭。 | 写 |
| `memos_archive` | 将笔记状态改为 `ARCHIVED`。默认关闭。 | 写 |
| `memos_sync_index` | 将 Memos 内容同步到本地语义索引。仅语义版启用。 | 读 |
| `memos_index_status` | 查看语义索引状态、条数、维度和模型。仅语义版启用。 | 读 |

`memos_update` 和 `memos_archive` 需要 `MEMOS_MCP_ENABLE_UPDATE_TOOLS=true`。当 `MEMOS_MCP_READONLY=true` 时，所有写工具不会被注册，并从客户端的工具列表中消失。

## 配置

所有配置通过环境变量提供。完整带注释的清单见 [`.env.example`](./.env.example)。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MEMOS_BASE_URL` | — | **必填。** Memos 实例地址（不带结尾斜杠）。 |
| `MEMOS_ACCESS_TOKEN` | — | Personal Access Token。**stdio 模式必填**；本地 HTTP 模式可选，如果客户端会发送 `Authorization: Bearer <token>` 则可不填。 |
| `MEMOS_MCP_TRANSPORT` | `stdio` | `stdio` 或 `http`。 |
| `MEMOS_MCP_HOST` | `127.0.0.1` | HTTP 绑定地址。 |
| `MEMOS_MCP_PORT` | `8080` | HTTP 端口。 |
| `MEMOS_MCP_READONLY` | `false` | 为 `true` 时隐藏所有写工具。 |
| `MEMOS_MCP_ENABLE_UPDATE_TOOLS` | `false` | 为 `true` 时注册 `memos_update` 和 `memos_archive`，但只读模式仍会隐藏它们。 |
| `MEMOS_MCP_ENABLE_SEMANTIC_SEARCH` | `false` | 为 `true` 时 `memos_search` 默认走语义搜索，并注册索引工具。 |
| `MEMOS_MCP_INDEX_DB` | `./data/memos-mcp-index.json` | 本地语义索引文件。 |
| `MEMOS_MCP_EMBEDDING_PROVIDER` | `disabled` | `disabled` 或 `openai-compatible`。 |
| `MEMOS_MCP_EMBEDDING_BASE_URL` | — | OpenAI-compatible embedding 地址，如 `http://127.0.0.1:11434/v1`。 |
| `MEMOS_MCP_EMBEDDING_MODEL` | — | embedding 模型名。 |
| `MEMOS_MCP_EMBEDDING_API_KEY` | — | 可选 embedding API key。 |
| `MEMOS_MCP_TIMEZONE` | `UTC` | 默认时区（IANA 名称），供时间检索工具使用。 |
| `MEMOS_MCP_MEMOS_API_VERSION` | — | 目标 Memos 版本基线（仅作提示）。 |

## 架构

```
AI 客户端
  │  MCP（本地 stdio | 本地 Streamable HTTP）
  ▼
传输层               只说 MCP 协议，不含业务逻辑
  ▼
工具注册 / 鉴权层     按配置注册工具、强制只读、为每次调用解析凭据
  ▼
应用层 / Memos 客户端 封装 Memos REST API，归一化响应
  ▼
Memos 实例
```

核心思想：

- **凭据来源是一层抽象。** stdio 从环境变量读取；本地 HTTP 可从每个请求的 `Authorization` 头读取。这是为了本地接入灵活性，不是为了公网多用户托管。
- **归一化层**把上游 Memos 响应转成稳定的内部结构，使 Memos 跨版本的 API 变化被限制在一处。

完整设计见 [`docs/architecture.md`](./docs/architecture.md)、[`docs/decisions.md`](./docs/decisions.md)、[`docs/roadmap.md`](./docs/roadmap.md)。
运维文档见 [`docs/quick-start.md`](./docs/quick-start.md)、[`docs/configuration.md`](./docs/configuration.md)、[`docs/transports.md`](./docs/transports.md)、[`docs/tools.md`](./docs/tools.md)、[`docs/semantic-search.md`](./docs/semantic-search.md)、[`docs/docker.md`](./docs/docker.md)、[`docs/deployment.md`](./docs/deployment.md)、[`docs/security.md`](./docs/security.md)、[`docs/troubleshooting.md`](./docs/troubleshooting.md)、[`docs/development.md`](./docs/development.md)。

## 开发

```bash
npm run dev         # tsx 监听模式运行（stdio）
npm run dev:http    # HTTP 模式运行
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # tsup 打包到 dist/
npm run smoke:http  # 用构建产物启动本地 HTTP 并检查 /healthz
```

CI 会在 Node.js 20 和 22 上运行类型检查、测试、构建和示例校验。Docker Image workflow 会在 GitHub Actions 中构建容器镜像，并在推送到 `main` 或版本标签时发布 GHCR 镜像。

## 安全

- 访问 token 绝不写入磁盘或日志；日志输出会把 token 脱敏为 `memos_pat_` 前缀。
- 笔记内容不会被记录到日志。
- HTTP 服务器默认绑定 `127.0.0.1`，绑定到其它地址时会发出警告。
- 本版本不包含破坏性工具。更新/归档工具默认关闭；全局只读模式可用。

## 路线图

项目分阶段构建。当前版本包含 **第一步（核心读写模块）**，并已加入第一版可选语义搜索能力。

### 已完成

- [x] 项目骨架：配置校验、传输层、鉴权抽象、归一化层。
- [x] `memos_list`、`memos_get`、`memos_search`、`memos_create`。
- [x] `memos_get_day`、`memos_get_range`、`memos_on_this_day`、`memos_get_by_tag`、`tags_list`、`resources_list`。
- [x] 权限门控的 `memos_update` / `memos_archive`（默认关闭）。
- [x] 本地 stdio + 本地 Streamable HTTP 两种传输。
- [x] 只读模式与本地 HTTP 请求头鉴权。

### 语义搜索

- [x] 本地 JSON 向量索引。
- [x] 开启语义搜索后，`memos_search` 默认走语义检索。
- [x] `memos_sync_index`、`memos_index_status`。
- [x] 嵌入提供方：`disabled` / `openai-compatible`。
- [ ] 面向更大索引的 SQLite/FTS5 后端。
- [ ] 进程内本地 embedding 模型提供方。

### 后续 —— 打包与分发

- [ ] 发布到 npm（`npx memos-mcp`）。
- [x] Docker 镜像与 Compose 示例。
- [x] CI（typecheck / test / build / 示例校验）与 Docker 镜像工作流。
- [x] 客户端配置示例（Claude Desktop、Cursor、VS Code）。
- [ ] 可选的 `.mcpb` 一键安装包。

## 许可证

[MIT](./LICENSE) © CharyeahOwO

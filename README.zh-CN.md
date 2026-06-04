# memos-mcp

[English](./README.md) | **简体中文**

一个面向 [Memos](https://github.com/usememos/memos) 的 [Model Context Protocol](https://modelcontextprotocol.io) 服务器——把你的 Memos 实例变成 AI 客户端可搜索、可安全写入的记忆后端。

> **状态：** 早期开发中（`v0.1.0`）。核心的读写工具已在 stdio 和 HTTP 两种传输下可用。语义搜索、时间检索与打包分发在路线图中。

`memos-mcp` 的定位是一个**公开、生产级的工具**，而非个人临时脚本。它既可以本地单用户运行，也可以托管部署——托管模式下由调用方在每个请求中自带 Memos 凭据，服务器自身不存储任何 token。

## 功能特性

- **核心笔记工具** —— 列出、获取、新建、关键词搜索笔记。
- **两种传输方式** —— `stdio`（本地桌面客户端，如 Claude Desktop、Cursor 等）与 **Streamable HTTP**（远程 / 托管）。
- **调用方自带钥匙鉴权** —— HTTP 模式下，调用方在每个请求中提供 `Authorization: Bearer <token>`；服务器不存储任何凭据，并按 token 隔离不同调用方（与 GitHub 官方 MCP 服务器同款思路）。
- **默认安全** —— 本版本不实现破坏性工具；全局只读模式可隐藏所有写工具；新建笔记默认 `PRIVATE` 私密；HTTP 服务器默认绑定 `127.0.0.1`。
- **抗版本漂移** —— 上游 Memos 响应会被归一化成稳定的内部结构，把 Memos API 跨版本的差异隔离在一处。
- **零重依赖** —— 基础服务器不加载任何嵌入或向量库。语义搜索将作为可选扩展提供。

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

### 本地运行（stdio）

适用于本地桌面 MCP 客户端。服务器使用环境变量里的单个 token。

```bash
MEMOS_BASE_URL=https://memos.example.com \
MEMOS_ACCESS_TOKEN=memos_pat_xxxxxxxx \
npm run start
```

开发时可用 `npm run dev`（监听模式），无需先构建。

### 以 HTTP 服务器运行

适用于远程 / 托管。环境里不放 token——每个调用方自带自己的钥匙。

```bash
MEMOS_MCP_TRANSPORT=http \
MEMOS_BASE_URL=https://memos.example.com \
npm run start
```

服务器监听 `http://127.0.0.1:8080/mcp`，健康检查在 `/healthz`。

> **公开暴露时：** 保持绑定 `127.0.0.1`，前面套一层带 **HTTPS** 的反向代理。切勿直接把 `0.0.0.0` 暴露到公网。每个调用方都必须自带 `Authorization: Bearer <自己的 memos token>`。

## 客户端配置

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

### HTTP（调用方自带 token）

```json
{
  "mcpServers": {
    "memos": {
      "type": "http",
      "url": "https://your-host.example.com/mcp",
      "headers": {
        "Authorization": "Bearer memos_pat_xxxxxxxx"
      }
    }
  }
}
```

## 工具

| 工具 | 说明 | 类型 |
| --- | --- | --- |
| `memos_list` | 列出最近的笔记（按时间倒序），支持翻页。 | 读 |
| `memos_get` | 按 id 或资源名（`memos/123`）获取单条笔记。 | 读 |
| `memos_search` | 按关键词搜索笔记内容（Memos 原生匹配，非语义搜索）。 | 读 |
| `memos_create` | 新建笔记。默认使用服务器配置的可见性（`PRIVATE`）。 | 写 |

当 `MEMOS_MCP_READONLY=true` 时，写工具不会被注册，并从客户端的工具列表中消失。

## 配置

所有配置通过环境变量提供。完整带注释的清单见 [`.env.example`](./.env.example)。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MEMOS_BASE_URL` | — | **必填。** Memos 实例地址（不带结尾斜杠）。 |
| `MEMOS_ACCESS_TOKEN` | — | Personal Access Token。**stdio 模式必填**；HTTP 模式可选（调用方自带）。 |
| `MEMOS_MCP_TRANSPORT` | `stdio` | `stdio` 或 `http`。 |
| `MEMOS_MCP_HOST` | `127.0.0.1` | HTTP 绑定地址。 |
| `MEMOS_MCP_PORT` | `8080` | HTTP 端口。 |
| `MEMOS_MCP_DEFAULT_VISIBILITY` | `PRIVATE` | 新建笔记的默认可见性（`PRIVATE` / `PROTECTED` / `PUBLIC`）。 |
| `MEMOS_MCP_READONLY` | `false` | 为 `true` 时隐藏所有写工具。 |
| `MEMOS_MCP_TIMEZONE` | `UTC` | 默认时区（IANA 名称），供后续时间检索工具使用。 |
| `MEMOS_MCP_MEMOS_API_VERSION` | — | 目标 Memos 版本基线（仅作提示）。 |

## 架构

```
AI 客户端
  │  MCP（stdio | Streamable HTTP）
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

- **凭据来源是一层抽象。** stdio 从环境变量读取；HTTP 从每个请求的 `Authorization` 头读取。将来要做托管多用户模式，只需新增一个解析器，无需改动其余代码。
- **归一化层**把上游 Memos 响应转成稳定的内部结构，使 Memos 跨版本的 API 变化被限制在一处。

完整设计见 [`docs/architecture.md`](./docs/architecture.md)、[`docs/decisions.md`](./docs/decisions.md)、[`docs/roadmap.md`](./docs/roadmap.md)。

## 开发

```bash
npm run dev         # tsx 监听模式运行（stdio）
npm run dev:http    # HTTP 模式运行
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # tsup 打包到 dist/
```

## 安全

- 访问 token 绝不写入磁盘或日志；日志输出会把 token 脱敏为 `memos_pat_` 前缀。
- 笔记内容不会被记录到日志。
- HTTP 服务器默认绑定 `127.0.0.1`，绑定到其它地址时会发出警告。
- 本版本不包含破坏性工具。全局只读模式可用。

## 路线图

项目分阶段构建。当前版本为 **第一步（核心读写模块）**。

### 已完成

- [x] 项目骨架：配置校验、传输层、鉴权抽象、归一化层。
- [x] `memos_list`、`memos_get`、`memos_search`、`memos_create`。
- [x] stdio + 无状态 Streamable HTTP 两种传输。
- [x] 只读模式与每请求鉴权。

### 下一步 —— 更多核心工具

- [ ] `memos_get_day`、`memos_get_range`、`memos_on_this_day` —— 时区感知的时间检索。
- [ ] `memos_get_by_tag`、`tags_list` —— 标签工具。
- [ ] `resources_list` —— 只读附件列表。
- [ ] 权限门控的 `memos_update` / `memos_archive`（默认关闭）。

### 后续 —— 语义搜索（可选扩展）

- [ ] 本地 SQLite 缓存 + FTS5 关键词索引。
- [ ] `memos_semantic_search`、`memos_sync_index`、`memos_index_status`。
- [ ] 嵌入提供方：`disabled` / `local` / `openai-compatible`。
- [ ] 托管多用户时按凭据隔离索引。

### 后续 —— 打包与分发

- [ ] 发布到 npm（`npx memos-mcp`）。
- [ ] Docker 镜像与 Compose 示例。
- [ ] CI（lint / typecheck / test / build）与发布流程。
- [ ] 客户端配置示例（Claude Desktop、Cursor、VS Code）。
- [ ] 可选的 `.mcpb` 一键安装包。

## 许可证

[MIT](./LICENSE) © CharyeahOwO

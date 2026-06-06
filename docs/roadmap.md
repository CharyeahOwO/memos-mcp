# 路线图（Roadmap）

本文件描述 memos-mcp 分几步做、每步做什么。决策理由见 [decisions.md](./decisions.md)。

---

## 总原则

**只做本地部署，不提供云服务。** 同一套代码靠配置开关提供两种部署形态：

```text
基础本地检索版 ─────────────► 本地 stdio / 本地 HTTP，直接转发 Memos API
基础本地检索版 + 向量模块 ──► 本地 JSON 向量索引 / embedding / 语义搜索，后续升级 SQLite / FTS
```

基础版必须轻量、稳定、容易安装；向量版必须显式开启，索引数据保存在用户本机。

---

## 第一阶段：基础本地检索版（MVP）

目标：做一个可本地运行的 MCP 服务器。它通过 stdio 或本地 Streamable HTTP 连接 AI 客户端，再转发到用户自己的 Memos 实例。基础模式不依赖向量能力；语义搜索作为显式开启的本地增强能力。

### 要做的工具

- `memos_list` — 列出最近的笔记
- `memos_get` — 按 id 取单条笔记
- `memos_create` — 新建笔记（调用时必须显式选择 visibility）
- `memos_search` — 关键词搜索（用 Memos 原生 CEL filter）
- `memos_get_day` — 看某一天的笔记（时区感知）
- `memos_get_range` — 看某个时间段的笔记（时区感知）
- `memos_on_this_day` — “那年今日”回顾
- `memos_get_by_tag` — 按标签查
- `tags_list` — 列出标签（只读）
- `resources_list` — 列出附件（只读）
- `memos_update` — 更新内容、可见性、置顶或状态（默认关闭）
- `memos_archive` — 归档笔记（默认关闭）

### 要做的基础设施

- **Memos 客户端层**：封装 REST 调用 + `NormalizedMemo` 归一化（隔离版本漂移）。
- **本地鉴权**：stdio 从 `MEMOS_ACCESS_TOKEN` 读取；本地 HTTP 从 `Authorization: Bearer <token>` 读取。
- **权限网关**：删除类工具不实现；更新/归档默认关闭、显式开启；全局只读模式开关。
- **本地传输**：stdio + Streamable HTTP。HTTP 默认绑定 `127.0.0.1`，不作为公网云服务。
- **配置**：环境变量 + 严格校验（`.env.example`）。
- **代码结构**：向量模块必须可选，基础版不加载 SQLite、本地模型或向量数据库依赖。

### 第一阶段交付物

- 能本地构建后通过 stdio 跑；npm 发布后支持 `npx memos-mcp`。
- 能作为本机 HTTP 服务运行，服务本地 HTTP 型 MCP 客户端。
- Docker 镜像与 Docker Compose 示例，仍然定位为用户自建本地/私有环境。
- 基础文档：quick-start、configuration、transports、tools、deployment、docker、security、troubleshooting、各客户端配置示例。
- 明确**不做**：作者云服务、公网多用户网关、默认开启向量能力、本地 SQLite 索引。

---

## 第二阶段：本地向量增强版

目标：在基础本地检索版上加“按意思搜笔记”的能力。用户显式开启后，memos-mcp 在本机维护索引和 embedding 数据。

### 要做的

- 已实现本地 JSON 向量索引（缓存 normalized memos + embeddings）。
- 已实现 `openai-compatible` embedding provider 配置。
- 已实现 `memos_sync_index` — 手动同步 Memos 数据到本地索引。
- 已实现 `memos_index_status` — 查看同步状态、索引规模、embedding 状态。
- 已实现 `memos_search` 语义模式；开启语义搜索后默认使用语义检索，可用 `mode: "keyword"` 强制关键词。
- 待实现本地 SQLite 索引（缓存 memos + tags + resources + sync state）。
- 待实现 SQLite FTS5 关键词索引，提供比远端 API 更稳定的本地关键词检索。
- 待实现本地 embedding provider（如本地模型）和更完整的增量同步。
- 数据隔离：默认按单用户本地实例设计；多账号使用时建议多个进程 + 多个 `MEMOS_MCP_INDEX_DB`。

### 明确边界

- 向量模块只给用户本地自建使用。
- 默认 `MEMOS_MCP_ENABLE_SEMANTIC_SEARCH=false`，不开时不加载任何向量依赖。
- 不把用户 memo 内容、索引库、embedding cache 上传到作者云端。
- 不承诺一个 HTTP 实例安全服务多个公网用户。

---

## 第三阶段：开源工程化与分发

- LICENSE（MIT）、贡献指南、issue/PR 模板。
- CI（typecheck / test / build）+ 发布流程。
- 发布 npm 包，支持 `npx memos-mcp`。
- 发布 Docker 镜像（GHCR）和 Compose 示例。
- 上 MCP Registry；可选 `.mcpb` 一键安装包（面向不懂代码的用户）。
- 完善文档：transports / tools / semantic-search / docker / security / memos-api-compatibility / development。

---

## 暂不做（明确排除）

- ❌ 作者提供云服务。
- ❌ 公网多用户 MCP 网关。
- ❌ 云端保存用户 Memos token。
- ❌ 云端保存用户 memo 索引或向量数据。
- ❌ Web 管理后台（第一/二阶段不需要）。
- ❌ 资源上传到初始公开工具集（安全考虑，后续再议）。

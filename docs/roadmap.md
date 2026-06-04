# 路线图（Roadmap）

本文件描述 memos-mcp 分几步做、每步做什么。决策理由见 [decisions.md](./decisions.md)。

---

## 总原则

**同一套代码，靠开关变出三种模式。** 不写三套。先把"普通功能模块"做扎实（它是一切的地基），再加"向量模块"。两个模块能合体也能拆开。

```
普通功能模块  ── 单独跑 ──► 模式1（云端）/ 也是模式3 的一半
向量模块      ── 单独跑 ──► 模式2 的本地部分
两者合体      ─────────►  模式3（全本地完整版）
```

---

## 第一步：普通功能模块（MVP）

目标：做一个**不含向量**的、可用的 MCP 服务器。做完后"模式 1（云端轻量版）"即可上线。

### 要做的工具
- `memos_list` — 列出最近的笔记
- `memos_get` — 按 id 取单条笔记
- `memos_create` — 新建笔记（默认 visibility = PRIVATE）
- `memos_search` — 关键词搜索（用 Memos 原生 CEL `content_search`）
- `memos_get_day` — 看某一天的笔记（时区感知）
- `memos_get_range` — 看某个时间段的笔记（时区感知）
- `memos_on_this_day` — "那年今日"回顾
- `memos_get_by_tag` — 按标签查
- `tags_list` — 列出标签（只读）
- `resources_list` — 列出附件（只读）

### 要做的基础设施
- **Memos 客户端层**：封装 REST 调用 + `NormalizedMemo` 归一化（隔离版本漂移）。
- **鉴权**：调用方自带 `Authorization: Bearer memos_pat_xxx`，服务器不存钥匙（见决策 2）。
- **权限网关**：危险工具（删除）默认关闭；更新/归档默认关或显式开启；全局只读模式开关。
- **传输**：stdio + Streamable HTTP。
- **配置**：环境变量 + 严格校验（`.env.example`）。
- **代码结构**：给向量模块预留"插槽"（接口预留，但不实现）。

### 第一步交付物
- 能 `npx` 本地跑（stdio）✅ 自己用
- Docker 镜像 ✅ 别人自建
- 挂域名跑 Streamable HTTP（HTTPS）✅ 模式 1 云端上线
- 基础文档：quick-start、configuration、各客户端配置示例
- 明确**不做**：向量 / 语义搜索 / 本地 SQLite 索引

---

## 第二步：向量模块（语义搜索）

目标：加上"按意思搜笔记"的能力。做完后"模式 2 / 模式 3"自动成立。

### 要做的
- 本地 SQLite 索引（缓存 memos + FTS5 关键词索引）
- 向量/语义搜索：provider 三模式 `disabled` / `local`（@xenova/transformers）/ `openai-compatible`
- `memos_semantic_search` / `memos_sync_index` / `memos_index_status` 工具
- 索引同步：全量 / 增量 / 重建
- **多用户隔离**：若向量版也要被多人连，缓存必须按钥匙指纹隔离（避免数据串号）

### 明确边界
- 向量模块**只给本地自建版**用，作者云端不部署（决策 3）。
- 默认 `MEMOS_MCP_ENABLE_SEMANTIC_SEARCH=false`，不开时不加载任何向量依赖。

---

## 第三步：开源工程化与分发

- LICENSE（MIT）、贡献指南、issue/PR 模板
- CI（lint / typecheck / test / build）+ 发布流程
- 发布 npm 包 + Docker 镜像（GHCR）
- 上 MCP Registry；可选 `.mcpb` 一键安装包（面向不懂代码的用户）
- 完善文档：transports / tools / semantic-search / docker / security / memos-api-compatibility

---

## 暂不做（明确排除）

- ❌ 云端多租户账号系统（靠"调用方自带钥匙"绕开了，见决策 2）
- ❌ 云端跑向量检索（成本不可控，留给本地自建）
- ❌ Web 管理后台（第一/二步不需要）
- ❌ 资源上传到初始公开工具集（安全考虑，后续再议）

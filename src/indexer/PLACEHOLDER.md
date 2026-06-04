# 索引层占位

本目录用于第二步实现「向量 / 语义搜索 / 本地索引」：

- SQLite 缓存（memos / tags / resources / sync_state / embeddings）
- FTS5 关键词索引
- 三模式语义搜索（disabled / local / openai-compatible）
- 同步：全量 / 增量 / 重建 / 状态

第一步（普通功能模块）**不实现**这些，也不引入任何向量依赖
（better-sqlite3 / @xenova/transformers）。详见 docs/roadmap.md 第二步。

import { z } from "zod";
import { errorMessage, fail, ok, summarizeMemo } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";
import { SemanticIndexService } from "../indexer/semantic-index.js";

const inputSchema = {
  query: z.string().min(1).describe("搜索查询。启用语义搜索时默认按语义检索，否则按关键词检索。"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe("关键词模式返回多少条，默认 20，最大 200"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("语义模式返回多少条，默认 20，最大 100"),
  minScore: z
    .number()
    .min(-1)
    .max(1)
    .optional()
    .describe("语义模式最低相似度分数，默认不过滤"),
  mode: z
    .enum(["auto", "semantic", "keyword"])
    .optional()
    .describe("搜索模式：auto（默认，启用语义则语义）/ semantic / keyword"),
} satisfies z.ZodRawShape;

export function createSearchTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_search",
    title: "搜索笔记",
    description:
      "搜索笔记。启用 MEMOS_MCP_ENABLE_SEMANTIC_SEARCH=true 后默认使用本地语义索引；未启用时使用 Memos 原生关键词匹配。",
    inputSchema,
    isWrite: false,
    handler: async (args, extra) => {
      try {
        const query = typeof args.query === "string" ? args.query : "";
        if (!query) return fail("缺少参数 query");
        const mode =
          args.mode === "semantic" || args.mode === "keyword" || args.mode === "auto"
            ? args.mode
            : "auto";

        const semanticIndex = new SemanticIndexService(deps.config);
        if (mode === "semantic" || (mode === "auto" && semanticIndex.isEnabled())) {
          const limit = typeof args.limit === "number" ? args.limit : 20;
          const minScore = typeof args.minScore === "number" ? args.minScore : undefined;
          const results = await semanticIndex.search(query, { limit, minScore });
          return ok({
            query,
            mode: "semantic",
            memos: results.map((item) => ({
              score: Number(item.score.toFixed(6)),
              ...summarizeMemo(item.memo),
            })),
          });
        }

        const pageSize = typeof args.pageSize === "number" ? args.pageSize : 20;
        const client = deps.authResolver.resolveClient(extra);
        const page = await client.searchMemos(query, { pageSize });
        return ok({
          query,
          mode: "keyword",
          memos: page.memos.map(summarizeMemo),
          nextPageToken: page.nextPageToken,
        });
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

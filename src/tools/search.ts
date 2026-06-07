import { z } from "zod";
import { errorMessage, fail, ok, summarizeMemo } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";
import { SemanticIndexService } from "../indexer/semantic-index.js";
import { readOnlyTool } from "./annotations.js";

const inputSchema = {
  query: z.string().min(1).describe("搜索查询。默认按本地向量索引做语义检索。"),
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
    .describe("搜索模式：auto（默认，等同 semantic）/ semantic / keyword"),
} satisfies z.ZodRawShape;

export function createSearchTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_search",
    title: "搜索笔记",
    description:
      "搜索笔记。适用于用户想查找、回忆、按含义检索 memo 时；默认使用本地向量索引做语义检索。只有用户明确要求精确关键词匹配时才传 mode: keyword。",
    annotations: readOnlyTool("搜索笔记"),
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

        if (mode === "semantic" || mode === "auto") {
          const semanticIndex = new SemanticIndexService(deps.config);
          const client = deps.authResolver.resolveClient(extra);
          const maintenance = await semanticIndex.ensureFresh(client);
          const limit = typeof args.limit === "number" ? args.limit : 20;
          const minScore = typeof args.minScore === "number" ? args.minScore : undefined;
          const results = await semanticIndex.search(query, { limit, minScore });
          return ok({
            query,
            mode: "semantic",
            index: {
              synced: maintenance.synced,
              reason: maintenance.reason,
              expired: maintenance.freshness.expired,
              expiresAt: maintenance.freshness.expiresAt,
              expiresInSeconds: maintenance.freshness.expiresInSeconds,
              ttlMinutes: maintenance.freshness.ttlMinutes,
            },
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

import { z } from "zod";
import { errorMessage, fail, ok, summarizeMemo } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";

const inputSchema = {
  query: z.string().min(1).describe("搜索关键词"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe("返回多少条，默认 20，最大 200"),
} satisfies z.ZodRawShape;

export function createSearchTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_search",
    title: "关键词搜索笔记",
    description:
      "用关键词搜索笔记内容（Memos 原生关键词匹配，非语义搜索）。语义搜索是后续版本的功能。",
    inputSchema,
    isWrite: false,
    handler: async (args, extra) => {
      try {
        const query = typeof args.query === "string" ? args.query : "";
        if (!query) return fail("缺少参数 query");
        const pageSize = typeof args.pageSize === "number" ? args.pageSize : 20;
        const client = deps.authResolver.resolveClient(extra);
        const page = await client.searchMemos(query, { pageSize });
        return ok({
          query,
          memos: page.memos.map(summarizeMemo),
          nextPageToken: page.nextPageToken,
        });
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

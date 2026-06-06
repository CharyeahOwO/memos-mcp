import { z } from "zod";
import { errorMessage, fail, ok, summarizeMemo } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";
import { readOnlyTool } from "./annotations.js";

const inputSchema = {
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe("返回多少条，默认 20，最大 200"),
  pageToken: z.string().optional().describe("翻页用的 token（来自上一次返回）"),
} satisfies z.ZodRawShape;

export function createListTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_list",
    title: "列出最近的笔记",
    description:
      "列出 Memos 中最近创建的笔记。适用于用户想浏览最近记录、查看最新 memo，且没有明确搜索词、日期或标签时。",
    annotations: readOnlyTool("列出最近的笔记"),
    inputSchema,
    isWrite: false,
    handler: async (args, extra) => {
      try {
        const client = deps.authResolver.resolveClient(extra);
        const pageSize = typeof args.pageSize === "number" ? args.pageSize : 20;
        const pageToken =
          typeof args.pageToken === "string" ? args.pageToken : undefined;
        const page = await client.listMemos({
          pageSize,
          pageToken,
          orderBy: "create_time desc",
        });
        return ok({
          memos: page.memos.map(summarizeMemo),
          nextPageToken: page.nextPageToken,
        });
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

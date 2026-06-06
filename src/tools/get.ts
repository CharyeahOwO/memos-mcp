import { z } from "zod";
import { errorMessage, fail, ok, summarizeMemo } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";
import { readOnlyTool } from "./annotations.js";

const inputSchema = {
  id: z
    .string()
    .min(1)
    .describe('笔记的 id 或资源名，例如 "123" 或 "memos/123"'),
} satisfies z.ZodRawShape;

export function createGetTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_get",
    title: "获取单条笔记",
    description:
      "按 id 或资源名获取一条指定笔记。适用于用户给出 memo id、memos/123 这类资源名，或要求打开某一条搜索结果时。",
    annotations: readOnlyTool("获取单条笔记"),
    inputSchema,
    isWrite: false,
    handler: async (args, extra) => {
      try {
        const id = typeof args.id === "string" ? args.id : "";
        if (!id) return fail("缺少参数 id");
        const client = deps.authResolver.resolveClient(extra);
        const memo = await client.getMemo(id);
        return ok(summarizeMemo(memo));
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

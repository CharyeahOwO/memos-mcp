import { z } from "zod";
import { errorMessage, fail, ok } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";

const inputSchema = {
  pageSize: z.number().int().min(1).max(200).optional().describe("每页拉取数量，默认 100，最大 200"),
  maxPages: z.number().int().min(1).max(50).optional().describe("最多拉取页数，默认 20，最大 50"),
} satisfies z.ZodRawShape;

function readPageControls(args: Record<string, unknown>): { pageSize: number; maxPages: number } {
  return {
    pageSize: typeof args.pageSize === "number" ? args.pageSize : 100,
    maxPages: typeof args.maxPages === "number" ? args.maxPages : 20,
  };
}

export function createResourcesListTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "resources_list",
    title: "列出附件",
    description: "从已拉取的笔记中聚合附件/资源列表，只读返回资源元数据和所属 memo。",
    inputSchema,
    isWrite: false,
    handler: async (args, extra) => {
      try {
        const client = deps.authResolver.resolveClient(extra);
        const { pageSize, maxPages } = readPageControls(args);
        const page = await client.listAllMemos({ pageSize, maxPages, orderBy: "create_time desc" });
        const resources = page.memos.flatMap((memo) =>
          (memo.resources ?? []).map((resource) => ({
            ...resource,
            memoId: memo.id,
            memoName: memo.name,
            memoCreatedAt: memo.createdAt,
          }))
        );
        return ok({ resources, scanned: page.memos.length, nextPageToken: page.nextPageToken });
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

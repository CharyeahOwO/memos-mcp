import { z } from "zod";
import { errorMessage, fail, ok, summarizeMemo } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";
import { readOnlyTool } from "./annotations.js";

const pageControls = {
  pageSize: z.number().int().min(1).max(200).optional().describe("每页拉取数量，默认 100，最大 200"),
  maxPages: z.number().int().min(1).max(50).optional().describe("最多拉取页数，默认 20，最大 50"),
} satisfies z.ZodRawShape;

const getByTagInputSchema = {
  tag: z.string().min(1).describe('标签名，可带或不带开头的 "#"'),
  ...pageControls,
} satisfies z.ZodRawShape;

const tagsListInputSchema = {
  ...pageControls,
} satisfies z.ZodRawShape;

function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#+/, "");
}

function readPageControls(args: Record<string, unknown>): { pageSize: number; maxPages: number } {
  return {
    pageSize: typeof args.pageSize === "number" ? args.pageSize : 100,
    maxPages: typeof args.maxPages === "number" ? args.maxPages : 20,
  };
}

async function loadMemos(deps: ToolDeps, args: Record<string, unknown>, extra: never) {
  const client = deps.authResolver.resolveClient(extra);
  const { pageSize, maxPages } = readPageControls(args);
  return client.listAllMemos({ pageSize, maxPages, orderBy: "create_time desc" });
}

export function createGetByTagTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_get_by_tag",
    title: "按标签获取笔记",
    description:
      "按标签名获取笔记。适用于用户指定 #tag、标签名或要求查看某个标签下的 memo；标签名可带或不带 #。",
    annotations: readOnlyTool("按标签获取笔记"),
    inputSchema: getByTagInputSchema,
    isWrite: false,
    handler: async (args, extra) => {
      try {
        const tag = typeof args.tag === "string" ? normalizeTag(args.tag) : "";
        if (!tag) return fail("缺少参数 tag");
        const page = await loadMemos(deps, args, extra as never);
        const memos = page.memos.filter((memo) =>
          memo.tags.some((memoTag) => normalizeTag(memoTag) === tag)
        );
        return ok({
          tag,
          memos: memos.map(summarizeMemo),
          scanned: page.memos.length,
          nextPageToken: page.nextPageToken,
        });
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

export function createTagsListTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "tags_list",
    title: "列出标签",
    description:
      "列出 Memos 中出现过的标签及数量。适用于用户想知道有哪些标签、标签统计或选择标签范围时。",
    annotations: readOnlyTool("列出标签"),
    inputSchema: tagsListInputSchema,
    isWrite: false,
    handler: async (args, extra) => {
      try {
        const page = await loadMemos(deps, args, extra as never);
        const counts = new Map<string, number>();
        for (const memo of page.memos) {
          for (const rawTag of memo.tags) {
            const tag = normalizeTag(rawTag);
            if (!tag) continue;
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
          }
        }
        const tags = [...counts.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        return ok({ tags, scanned: page.memos.length, nextPageToken: page.nextPageToken });
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

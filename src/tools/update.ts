import { z } from "zod";
import { VISIBILITIES } from "../config/index.js";
import { errorMessage, fail, ok, summarizeMemo } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";

const STATES = ["NORMAL", "ARCHIVED"] as const;

const updateInputSchema = {
  name: z
    .string()
    .min(1)
    .describe('笔记资源名或 id，例如 "memos/123" 或 "123"'),
  content: z.string().min(1).optional().describe("新的笔记内容（Markdown 文本）"),
  visibility: z
    .enum(VISIBILITIES)
    .optional()
    .describe("新的可见性：PRIVATE / PROTECTED / PUBLIC"),
  pinned: z.boolean().optional().describe("是否置顶"),
  state: z.enum(STATES).optional().describe("状态：NORMAL / ARCHIVED"),
} satisfies z.ZodRawShape;

const archiveInputSchema = {
  name: z
    .string()
    .min(1)
    .describe('要归档的笔记资源名或 id，例如 "memos/123" 或 "123"'),
} satisfies z.ZodRawShape;

function readVisibility(value: unknown) {
  return value === "PRIVATE" || value === "PROTECTED" || value === "PUBLIC"
    ? value
    : undefined;
}

function readState(value: unknown) {
  return value === "NORMAL" || value === "ARCHIVED" ? value : undefined;
}

export function createUpdateTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_update",
    title: "更新笔记",
    description:
      "更新一条 Memos 笔记。默认不注册，只有 MEMOS_MCP_ENABLE_UPDATE_TOOLS=true 且非只读模式时可用。",
    inputSchema: updateInputSchema,
    isWrite: true,
    featureFlag: "enableUpdateTools",
    handler: async (args, extra) => {
      try {
        const name = typeof args.name === "string" ? args.name : "";
        if (!name) return fail("缺少参数 name");

        const content =
          typeof args.content === "string" ? args.content : undefined;
        const visibility = readVisibility(args.visibility);
        const pinned = typeof args.pinned === "boolean" ? args.pinned : undefined;
        const state = readState(args.state);

        if (
          content === undefined &&
          visibility === undefined &&
          pinned === undefined &&
          state === undefined
        ) {
          return fail("至少需要提供 content / visibility / pinned / state 中的一个更新字段");
        }

        const client = deps.authResolver.resolveClient(extra);
        const memo = await client.updateMemo({
          name,
          content,
          visibility,
          pinned,
          state,
        });
        return ok(summarizeMemo(memo));
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

export function createArchiveTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_archive",
    title: "归档笔记",
    description:
      "将一条 Memos 笔记状态改为 ARCHIVED。默认不注册，只有 MEMOS_MCP_ENABLE_UPDATE_TOOLS=true 且非只读模式时可用。",
    inputSchema: archiveInputSchema,
    isWrite: true,
    featureFlag: "enableUpdateTools",
    handler: async (args, extra) => {
      try {
        const name = typeof args.name === "string" ? args.name : "";
        if (!name) return fail("缺少参数 name");

        const client = deps.authResolver.resolveClient(extra);
        const memo = await client.updateMemo({ name, state: "ARCHIVED" });
        return ok(summarizeMemo(memo));
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

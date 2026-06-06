import { z } from "zod";
import { errorMessage, fail, ok, summarizeMemo } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";
import { VISIBILITIES } from "../config/index.js";

const inputSchema = {
  content: z.string().min(1).describe("笔记内容（Markdown 文本）"),
  visibility: z
    .enum(VISIBILITIES)
    .describe(
      "可见性，必须由模型根据内容隐私性选择：PRIVATE（私密）/ PROTECTED（登录可见）/ PUBLIC（公开）。"
    ),
} satisfies z.ZodRawShape;

export function createCreateTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_create",
    title: "新建笔记",
    description:
      "在 Memos 中新建一条笔记。必须显式选择 visibility，让模型根据内容隐私性决定 PRIVATE / PROTECTED / PUBLIC。",
    inputSchema,
    isWrite: true,
    handler: async (args, extra) => {
      try {
        const content = typeof args.content === "string" ? args.content : "";
        if (!content) return fail("缺少参数 content");
        const visibility =
          args.visibility === "PRIVATE" ||
          args.visibility === "PROTECTED" ||
          args.visibility === "PUBLIC"
            ? args.visibility
            : undefined;
        if (!visibility) {
          return fail(
            "缺少参数 visibility。请根据笔记内容隐私性选择 PRIVATE / PROTECTED / PUBLIC。"
          );
        }

        const client = deps.authResolver.resolveClient(extra);
        const memo = await client.createMemo({ content, visibility });
        return ok(summarizeMemo(memo));
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

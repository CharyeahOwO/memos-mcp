import { z } from "zod";
import { errorMessage, fail, ok, summarizeMemo } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";
import { VISIBILITIES } from "../config/index.js";

const inputSchema = {
  content: z.string().min(1).describe("笔记内容（Markdown 文本）"),
  visibility: z
    .enum(VISIBILITIES)
    .optional()
    .describe(
      "可见性：PRIVATE（私密）/ PROTECTED（登录可见）/ PUBLIC（公开）。不填则用服务器默认值（通常 PRIVATE）。"
    ),
} satisfies z.ZodRawShape;

export function createCreateTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_create",
    title: "新建笔记",
    description: "在 Memos 中新建一条笔记。不指定可见性时使用服务器配置的默认值。",
    inputSchema,
    isWrite: true,
    handler: async (args, extra) => {
      try {
        const content = typeof args.content === "string" ? args.content : "";
        if (!content) return fail("缺少参数 content");
        // 可见性兜底为配置的默认值（保守起见通常是 PRIVATE）
        const visibility =
          args.visibility === "PRIVATE" ||
          args.visibility === "PROTECTED" ||
          args.visibility === "PUBLIC"
            ? args.visibility
            : deps.config.defaultVisibility;

        const client = deps.authResolver.resolveClient(extra);
        const memo = await client.createMemo({ content, visibility });
        return ok(summarizeMemo(memo));
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

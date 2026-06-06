import { z } from "zod";
import { SemanticIndexService } from "../indexer/semantic-index.js";
import { errorMessage, fail, ok } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";

const pageControlsSchema = {
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe("每页拉取数量，默认 100，最大 200"),
  maxPages: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe("最多扫描页数，默认 20，最大 200"),
} satisfies z.ZodRawShape;

export function createSyncIndexTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_sync_index",
    title: "同步语义索引",
    description:
      "将 Memos 内容同步到本地语义索引。需要启用 MEMOS_MCP_ENABLE_SEMANTIC_SEARCH 并配置 OpenAI-compatible embeddings。",
    inputSchema: pageControlsSchema,
    isWrite: false,
    featureFlag: "enableSemanticSearch",
    handler: async (args, extra) => {
      try {
        const pageSize = typeof args.pageSize === "number" ? args.pageSize : 100;
        const maxPages = typeof args.maxPages === "number" ? args.maxPages : 20;
        const client = deps.authResolver.resolveClient(extra);
        const service = new SemanticIndexService(deps.config);
        const result = await service.sync(client, { pageSize, maxPages });
        return ok(result);
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

export function createIndexStatusTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_index_status",
    title: "查看语义索引状态",
    description: "查看本地语义索引是否启用、是否已同步、索引条数和 embedding 配置。",
    inputSchema: {},
    isWrite: false,
    featureFlag: "enableSemanticSearch",
    handler: async () => {
      try {
        const service = new SemanticIndexService(deps.config);
        const result = await service.status();
        return ok(result);
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

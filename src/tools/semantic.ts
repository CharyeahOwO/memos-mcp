import { z } from "zod";
import { SemanticIndexService } from "../indexer/semantic-index.js";
import { errorMessage, fail, ok } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";
import { localReadOnlyTool, syncTool } from "./annotations.js";

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
  force: z
    .boolean()
    .optional()
    .describe("是否强制重建所有 embedding；当 embedding 维度变化但 provider/model 名称不变时使用"),
} satisfies z.ZodRawShape;

export function createSyncIndexTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_sync_index",
    title: "同步语义索引",
    description:
      "将 Memos 内容同步到本地语义索引。适用于首次使用语义搜索、索引为空、搜索结果过旧或用户要求刷新长期记忆时；会写本地索引，不修改 Memos。",
    annotations: syncTool("同步语义索引"),
    inputSchema: pageControlsSchema,
    isWrite: false,
    handler: async (args, extra) => {
      try {
        const pageSize = typeof args.pageSize === "number" ? args.pageSize : 100;
        const maxPages = typeof args.maxPages === "number" ? args.maxPages : 20;
        const force = args.force === true;
        const client = deps.authResolver.resolveClient(extra);
        const service = new SemanticIndexService(deps.config);
        const result = await service.syncLocked(client, { pageSize, maxPages, force });
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
    description:
      "查看本地语义索引是否已同步、索引条数、向量维度、embedding 模型和索引路径。适用于诊断搜索不可用或确认索引是否就绪。",
    annotations: localReadOnlyTool("查看语义索引状态"),
    inputSchema: {},
    isWrite: false,
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

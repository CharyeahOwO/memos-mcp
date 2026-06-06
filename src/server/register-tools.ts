import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDefinition, ToolDeps } from "../tools/types.js";
import { createListTool } from "../tools/list.js";
import { createGetTool } from "../tools/get.js";
import { createSearchTool } from "../tools/search.js";
import { createCreateTool } from "../tools/create.js";
import {
  createGetDayTool,
  createGetRangeTool,
  createOnThisDayTool,
} from "../tools/time.js";
import { createGetByTagTool, createTagsListTool } from "../tools/tags.js";
import { createResourcesListTool } from "../tools/resources.js";
import { createArchiveTool, createUpdateTool } from "../tools/update.js";
import { createIndexStatusTool, createSyncIndexTool } from "../tools/semantic.js";
import { logger } from "../logging/logger.js";

/**
 * 权限网关（见 docs/architecture.md Safety Model）。
 *
 * - 收集所有工具定义。
 * - 只读模式（config.readonly）下，写工具（isWrite）直接【不注册】，
 *   从客户端的 tools/list 里消失，而非运行时再拒绝。
 * - 删除类工具第一步压根不实现，无需在此处理。
 */

/** 所有工具工厂。新增工具时在这里登记即可。 */
const TOOL_FACTORIES: ((deps: ToolDeps) => ToolDefinition)[] = [
  createListTool,
  createGetTool,
  createSearchTool,
  createGetDayTool,
  createGetRangeTool,
  createOnThisDayTool,
  createGetByTagTool,
  createTagsListTool,
  createResourcesListTool,
  createCreateTool,
  createUpdateTool,
  createArchiveTool,
  createSyncIndexTool,
  createIndexStatusTool,
];

export function registerTools(server: McpServer, deps: ToolDeps): string[] {
  const registered: string[] = [];

  for (const factory of TOOL_FACTORIES) {
    const tool = factory(deps);

    // 权限网关：只读模式跳过写工具
    if (deps.config.readonly && tool.isWrite) {
      continue;
    }

    if (tool.featureFlag && !deps.config[tool.featureFlag]) {
      continue;
    }

    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      // SDK 把已解析的参数作为第一参数、extra 作为第二参数传入
      async (args: Record<string, unknown>, extra: unknown) => {
        return tool.handler(args, extra as never);
      }
    );
    registered.push(tool.name);
  }

  const mode = deps.config.readonly ? "（只读模式）" : "";
  logger.info(`已注册 ${registered.length} 个工具${mode}：${registered.join(", ")}`);
  return registered;
}

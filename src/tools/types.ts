import { z } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { AuthResolver } from "../auth/resolver.js";
import type { AppConfig } from "../config/index.js";
import type { ToolResult } from "./format.js";
import type { RequestExtra } from "../auth/resolver.js";

/**
 * 工具定义的统一形状。每个工具导出一个 createXxxTool 工厂，
 * 由 server/register-tools.ts 注入依赖（authResolver、config）后注册。
 */

export interface ToolDeps {
  authResolver: AuthResolver;
  config: AppConfig;
}

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  /** MCP 行为提示，帮助客户端和模型区分只读、写入、破坏性等工具 */
  annotations?: ToolAnnotations;
  /** zod 字段对象，作为 registerTool 的 inputSchema */
  inputSchema: z.ZodRawShape;
  /** 是否为写工具：只读模式下不注册 */
  isWrite: boolean;
  /** 需要显式开启的能力开关；关闭时不注册 */
  featureFlag?: "enableUpdateTools";
  handler: (args: Record<string, unknown>, extra: RequestExtra) => Promise<ToolResult>;
}

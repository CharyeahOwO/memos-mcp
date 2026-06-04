import { z } from "zod";
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
  /** zod 字段对象，作为 registerTool 的 inputSchema */
  inputSchema: z.ZodRawShape;
  /** 是否为写工具：只读模式下不注册 */
  isWrite: boolean;
  handler: (args: Record<string, unknown>, extra: RequestExtra) => Promise<ToolResult>;
}

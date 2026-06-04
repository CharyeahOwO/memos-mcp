import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./register-tools.js";
import { createAuthResolver } from "../auth/resolver.js";
import type { AppConfig } from "../config/index.js";

/**
 * 构建一个配好工具的 McpServer。
 *
 * stdio 模式启动一次复用；http 无状态模式每个请求新建一个（见 http.ts）。
 * 因此本函数必须是纯粹"按 config 造一个 server"，不持有跨请求状态。
 */
export function buildServer(config: AppConfig): McpServer {
  const server = new McpServer({
    name: "memos-mcp",
    version: "0.1.0",
  });

  const authResolver = createAuthResolver(config);
  registerTools(server, { authResolver, config });

  return server;
}

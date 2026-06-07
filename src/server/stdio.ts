import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./build-server.js";
import { logger } from "../logging/logger.js";
import type { AppConfig } from "../config/index.js";
import { startIndexScheduler } from "../indexer/scheduler.js";

/** 启动 stdio 传输（本地用，给 Claude Desktop / Cursor 等）。 */
export async function startStdio(config: AppConfig): Promise<void> {
  startIndexScheduler(config);
  const server = buildServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("已通过 stdio 启动，等待 MCP 客户端连接。");
}

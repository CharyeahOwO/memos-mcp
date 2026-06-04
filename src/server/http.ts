import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer } from "./build-server.js";
import { logger } from "../logging/logger.js";
import type { AppConfig } from "../config/index.js";

/**
 * 启动无状态 Streamable HTTP 传输（远程 / 云端用）。
 *
 * 无状态模式（sessionIdGenerator: undefined）：每个 POST /mcp 请求都新建一个
 * McpServer + transport，处理完即关闭。钥匙由调用方在 Authorization 头自带，
 * 服务器不存任何钥匙、不存任何会话状态（见 docs/decisions.md 决策 2/3）。
 *
 * 安全：默认绑 127.0.0.1。要对外暴露请用反向代理 + HTTPS，不要直接绑 0.0.0.0。
 */
export async function startHttp(config: AppConfig): Promise<void> {
  const app = express();
  app.use(express.json());

  // 健康检查
  app.get("/healthz", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    // 每请求新建 server + transport（无状态，不可复用）
    const server = buildServer(config);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.error(`处理 MCP 请求出错：${reason}`);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  // 无状态模式下 GET/DELETE 无意义
  const methodNotAllowed = (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
  };
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  await new Promise<void>((resolve) => {
    app.listen(config.port, config.host, () => {
      logger.info(
        `已通过 HTTP 启动：http://${config.host}:${config.port}/mcp（健康检查 /healthz）`
      );
      if (config.host !== "127.0.0.1" && config.host !== "localhost") {
        logger.warn(
          `当前绑定到 ${config.host}，已对外暴露。请确保前面有反向代理 + HTTPS，` +
            "且每个调用方自带 Authorization: Bearer <自己的 Memos token>。"
        );
      }
      resolve();
    });
  });
}

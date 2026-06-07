import type { AppConfig } from "../config/index.js";
import { logger } from "../logging/logger.js";
import { MemosClient } from "../memos/client.js";
import { SemanticIndexService } from "./semantic-index.js";

export function startIndexScheduler(config: AppConfig): void {
  const wantsStartupSync = config.syncOnStart;
  const wantsIntervalSync = config.syncIntervalMinutes > 0;
  if (!wantsStartupSync && !wantsIntervalSync) return;

  if (!config.memosAccessToken) {
    logger.info(
      "未配置 MEMOS_ACCESS_TOKEN，跳过服务端定时语义索引同步；HTTP 请求仍可用 Authorization token 在搜索过期时同步。"
    );
    return;
  }

  const client = new MemosClient({
    baseUrl: config.memosBaseUrl,
    token: config.memosAccessToken,
  });
  const service = new SemanticIndexService(config);

  const runSync = async (reason: "startup" | "interval") => {
    try {
      const result = await service.syncLocked(client);
      logger.info(
        `语义索引${reason === "startup" ? "启动" : "定时"}同步完成：indexed=${String(
          result.indexed ?? "?"
        )}, embedded=${String(result.embedded ?? "?")}, reused=${String(result.reused ?? "?")}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`语义索引${reason === "startup" ? "启动" : "定时"}同步失败：${message}`);
    }
  };

  if (wantsStartupSync) {
    void runSync("startup");
  }

  if (wantsIntervalSync) {
    const timer = setInterval(() => {
      void runSync("interval");
    }, config.syncIntervalMinutes * 60_000);
    timer.unref?.();
    logger.info(`已启用语义索引定时同步：每 ${config.syncIntervalMinutes} 分钟执行一次。`);
  }
}

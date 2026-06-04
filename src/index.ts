import { ConfigError, loadConfig } from "./config/index.js";
import { startStdio } from "./server/stdio.js";
import { startHttp } from "./server/http.js";
import { logger } from "./logging/logger.js";

/**
 * 入口：读配置 → 按传输方式启动。
 * 配置错误打印友好中文信息并以退出码 1 退出。
 */
async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  if (config.transport === "http") {
    await startHttp(config);
  } else {
    await startStdio(config);
  }
}

main().catch((error) => {
  const reason = error instanceof Error ? error.stack ?? error.message : String(error);
  logger.error(`启动失败：${reason}`);
  process.exit(1);
});

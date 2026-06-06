/**
 * 极简日志。
 *
 * 安全红线（见 docs/architecture.md Safety Defaults）：绝不打印 Authorization 头、token、
 * 或 memo 内容。redactToken 仅在确需提及 token 时显示前缀，掩盖主体。
 *
 * 注意：stdio 传输用 stdout 传输 MCP 协议消息，因此日志一律走 stderr，
 * 避免污染协议通道。
 */

type Level = "info" | "warn" | "error";

function write(level: Level, message: string): void {
  const prefix = `[memos-mcp] ${level.toUpperCase()}`;
  // 全部写 stderr，不干扰 stdio 传输的 stdout
  process.stderr.write(`${prefix} ${message}\n`);
}

export const logger = {
  info: (message: string) => write("info", message),
  warn: (message: string) => write("warn", message),
  error: (message: string) => write("error", message),
};

/**
 * 对 token 脱敏：只保留 memos_pat_ 前缀，主体用 *** 替代。
 * 用于"需要在日志里指明用了哪类 token"的极少数场景。
 */
export function redactToken(token: string | undefined): string {
  if (!token) return "(none)";
  const prefix = "memos_pat_";
  if (token.startsWith(prefix)) return `${prefix}***`;
  return "***";
}

/**
 * 错误类型定义。
 *
 * - AuthError：鉴权相关（缺少 token、token 格式不对）。由 auth/resolver 抛出。
 * - MemosApiError：调用 Memos API 失败（网络错误、非 2xx 响应）。由 client 抛出。
 *
 * 两者都携带中文可读信息，最终在 tool handler 里转成 { isError: true } 返回给客户端，
 * 不向上 throw 导致服务器崩溃。
 */

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class MemosApiError extends Error {
  /** HTTP 状态码（网络层错误时为 undefined） */
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "MemosApiError";
    this.status = status;
  }
}

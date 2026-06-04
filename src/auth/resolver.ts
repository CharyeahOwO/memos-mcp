import { MemosClient } from "../memos/client.js";
import { AuthError } from "../memos/errors.js";
import type { AppConfig } from "../config/index.js";

/**
 * 鉴权来源抽象 —— 多用户留门的核心（见 docs/decisions.md 决策 2）。
 *
 * 关键思想：把"这次调用该用谁的钥匙去连哪个 Memos"做成一个可替换的部件。
 * - stdio 模式：钥匙来自环境变量（EnvAuthResolver）。
 * - http 模式：钥匙来自每个请求的 Authorization header（HttpHeaderAuthResolver），
 *   服务器自己不存任何钥匙。
 * - 将来要做多用户托管：再加一个"按登录账户查 token"的 resolver 即可，
 *   client/tools/server 全部不用动。
 */

/** tool handler 第二参数 extra 的最小结构（只取我们需要的 header 部分） */
export interface RequestExtra {
  requestInfo?: {
    headers?: Record<string, string | string[] | undefined>;
  };
}

/** 解析结果：拿到这次调用应使用的 Memos 凭据 */
export interface ResolvedAuth {
  baseUrl: string;
  token: string;
}

export interface AuthResolver {
  /** 为这次调用解析出 { baseUrl, token }，失败抛 AuthError */
  resolve(extra: RequestExtra): ResolvedAuth;
  /** 便捷方法：直接拿到一个配好钥匙的 MemosClient */
  resolveClient(extra: RequestExtra): MemosClient;
}

abstract class BaseAuthResolver implements AuthResolver {
  abstract resolve(extra: RequestExtra): ResolvedAuth;

  resolveClient(extra: RequestExtra): MemosClient {
    const { baseUrl, token } = this.resolve(extra);
    return new MemosClient({ baseUrl, token });
  }
}

/** stdio 模式：token 来自配置（环境变量 MEMOS_ACCESS_TOKEN） */
export class EnvAuthResolver extends BaseAuthResolver {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: AppConfig) {
    super();
    if (!config.memosAccessToken) {
      // 正常不会走到这里：config 层已对 stdio 模式强制要求 token
      throw new AuthError("stdio 模式缺少 MEMOS_ACCESS_TOKEN");
    }
    this.baseUrl = config.memosBaseUrl;
    this.token = config.memosAccessToken;
  }

  resolve(): ResolvedAuth {
    return { baseUrl: this.baseUrl, token: this.token };
  }
}

/** http 模式：token 来自每个请求的 Authorization header */
export class HttpHeaderAuthResolver extends BaseAuthResolver {
  private readonly baseUrl: string;

  constructor(config: AppConfig) {
    super();
    this.baseUrl = config.memosBaseUrl;
  }

  resolve(extra: RequestExtra): ResolvedAuth {
    const raw = extra.requestInfo?.headers?.["authorization"];
    const headerValue = Array.isArray(raw) ? raw[0] : raw;

    if (!headerValue) {
      throw new AuthError(
        "缺少 Authorization 请求头。请在 MCP 客户端配置里加上 " +
          'Authorization: Bearer <你的 Memos token>（形如 memos_pat_xxxx）。'
      );
    }

    const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
    if (!match || !match[1]) {
      throw new AuthError(
        'Authorization 头格式不对，应为 "Bearer <token>"。'
      );
    }

    return { baseUrl: this.baseUrl, token: match[1].trim() };
  }
}

/** 根据传输方式选择合适的 resolver */
export function createAuthResolver(config: AppConfig): AuthResolver {
  return config.transport === "http"
    ? new HttpHeaderAuthResolver(config)
    : new EnvAuthResolver(config);
}

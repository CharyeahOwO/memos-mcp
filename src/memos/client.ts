import { MemosApiError } from "./errors.js";
import { normalizeMemo, normalizeMemoList } from "./normalize.js";
import type {
  NormalizedMemo,
  NormalizedMemoPage,
  RawListMemosResponse,
  RawMemo,
} from "./types.js";
import type { Visibility } from "../config/index.js";

/**
 * Memos REST API 客户端。
 *
 * 设计要点：
 * - 这是全项目唯一直接对接 Memos HTTP API 的地方。
 * - 每个实例携带一对 { baseUrl, token }，由 auth resolver 按当前本地调用创建
 *   （stdio 来自 env、本地 http 来自请求头，见 auth/resolver.ts）。
 * - 所有响应都过 normalize，对外只暴露 NormalizedMemo。
 * - 失败统一抛 MemosApiError（中文信息）。
 */

const API_PREFIX = "/api/v1";

export interface MemosClientOptions {
  baseUrl: string;
  token: string;
}

export interface ListMemosParams {
  pageSize?: number;
  pageToken?: string;
  /** CEL filter 表达式，如 content_search == ["foo"] */
  filter?: string;
  /** 排序，如 "pinned desc, create_time desc" */
  orderBy?: string;
  /** NORMAL / ARCHIVED */
  state?: string;
}

export interface CreateMemoParams {
  content: string;
  visibility: Visibility;
}

export class MemosClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(options: MemosClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
  }

  /** 发起请求并解析 JSON，非 2xx 转 MemosApiError */
  private async request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${API_PREFIX}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(init.headers ?? {}),
        },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new MemosApiError(`连接 Memos 失败：${reason}（请检查 MEMOS_BASE_URL 是否正确、Memos 是否在运行）`);
    }

    if (!response.ok) {
      const body = await safeReadText(response);
      throw new MemosApiError(
        `Memos API 返回错误 ${response.status}：${body || response.statusText}`,
        response.status
      );
    }

    // 某些端点可能返回空 body
    const text = await safeReadText(response);
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new MemosApiError("Memos API 返回的内容不是合法 JSON");
    }
  }

  /** 列出 memos */
  async listMemos(params: ListMemosParams = {}): Promise<NormalizedMemoPage> {
    const query = new URLSearchParams();
    if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
    if (params.pageToken) query.set("pageToken", params.pageToken);
    if (params.filter) query.set("filter", params.filter);
    if (params.orderBy) query.set("orderBy", params.orderBy);
    if (params.state) query.set("state", params.state);

    const qs = query.toString();
    const path = qs ? `/memos?${qs}` : "/memos";
    const raw = await this.request<RawListMemosResponse>(path, { method: "GET" });
    return normalizeMemoList(raw);
  }

  /**
   * 获取单条 memo。
   * @param name 资源名 "memos/123" 或裸 id "123"
   */
  async getMemo(name: string): Promise<NormalizedMemo> {
    const resourceName = name.includes("/") ? name : `memos/${name}`;
    const raw = await this.request<RawMemo>(`/${resourceName}`, { method: "GET" });
    return normalizeMemo(raw);
  }

  /** 创建 memo */
  async createMemo(params: CreateMemoParams): Promise<NormalizedMemo> {
    const raw = await this.request<RawMemo>("/memos", {
      method: "POST",
      body: JSON.stringify({
        content: params.content,
        visibility: params.visibility,
      }),
    });
    return normalizeMemo(raw);
  }

  /** 关键词搜索：走 CEL content_search */
  async searchMemos(
    query: string,
    params: { pageSize?: number } = {}
  ): Promise<NormalizedMemoPage> {
    // CEL filter：当前 Memos 版本（v0.24+）使用方法式语法 content.contains("...")。
    // 旧版本（<=v0.22）曾用 content_search == [...]，已不再适用。
    const filter = `content.contains(${JSON.stringify(query)})`;
    return this.listMemos({
      filter,
      pageSize: params.pageSize,
      orderBy: "create_time desc",
    });
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

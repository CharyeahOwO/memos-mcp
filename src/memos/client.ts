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

export interface ListAllMemosParams extends ListMemosParams {
  /** Safety cap for local aggregation tools. */
  maxPages?: number;
}

export interface CreateMemoParams {
  content: string;
  visibility: Visibility;
}

export interface UpdateMemoParams {
  name: string;
  content?: string;
  visibility?: Visibility;
  pinned?: boolean;
  /** Memos state, usually NORMAL or ARCHIVED. */
  state?: "NORMAL" | "ARCHIVED";
}

export class MemosClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(options: MemosClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
  }

  private resolveMemoName(name: string): string {
    return name.includes("/") ? name : `memos/${name}`;
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

  /** 分页拉取多页 memos，供本地聚合类工具使用。 */
  async listAllMemos(params: ListAllMemosParams = {}): Promise<NormalizedMemoPage> {
    const pageSize = params.pageSize ?? 100;
    const maxPages = params.maxPages ?? 20;
    const memos: NormalizedMemo[] = [];
    let pageToken = params.pageToken;
    let nextPageToken: string | undefined;

    for (let page = 0; page < maxPages; page += 1) {
      const result = await this.listMemos({
        ...params,
        pageSize,
        pageToken,
      });
      memos.push(...result.memos);
      nextPageToken = result.nextPageToken;
      if (!nextPageToken) break;
      pageToken = nextPageToken;
    }

    return { memos, nextPageToken };
  }

  /**
   * 获取单条 memo。
   * @param name 资源名 "memos/123" 或裸 id "123"
   */
  async getMemo(name: string): Promise<NormalizedMemo> {
    const resourceName = this.resolveMemoName(name);
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

  /** 更新 memo。Memos v1 REST 使用 updateMask 查询参数指定字段掩码。 */
  async updateMemo(params: UpdateMemoParams): Promise<NormalizedMemo> {
    const resourceName = this.resolveMemoName(params.name);
    const memo: Record<string, unknown> = { name: resourceName };
    const updateMask: string[] = [];

    if (params.content !== undefined) {
      memo.content = params.content;
      updateMask.push("content");
    }
    if (params.visibility !== undefined) {
      memo.visibility = params.visibility;
      updateMask.push("visibility");
    }
    if (params.pinned !== undefined) {
      memo.pinned = params.pinned;
      updateMask.push("pinned");
    }
    if (params.state !== undefined) {
      memo.state = params.state;
      updateMask.push("state");
    }

    if (updateMask.length === 0) {
      throw new MemosApiError("更新 memo 至少需要提供一个待更新字段");
    }

    const query = new URLSearchParams({ updateMask: updateMask.join(",") });
    const raw = await this.request<RawMemo>(`/${resourceName}?${query.toString()}`, {
      method: "PATCH",
      body: JSON.stringify(memo),
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

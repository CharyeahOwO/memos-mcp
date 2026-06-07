import type {
  NormalizedMemo,
  NormalizedMemoPage,
  NormalizedResource,
  RawListMemosResponse,
  RawMemo,
  RawResource,
} from "./types.js";

/**
 * 归一化层：把上游 Memos API 的原始响应转成内部稳定形状。
 *
 * 这是隔离"Memos API 版本漂移"的唯一防线（见 docs/architecture.md）。
 * v0.22 之后字段从 snake_case 迁到 camelCase、rowStatus 改成 state、
 * 裸 id 改成 "memos/{id}" 资源名——这些差异全部在这里抹平。
 */

/** 从 "memos/123" 或裸 id 中抽出稳定的 id 字符串 */
function extractId(memo: RawMemo): string {
  if (memo.name && memo.name.includes("/")) {
    const parts = memo.name.split("/");
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  if (memo.uid) return String(memo.uid);
  if (memo.id !== undefined) return String(memo.id);
  if (memo.name) return memo.name;
  return "";
}

/** 构造资源名 "memos/{id}"（上游没给 name 时用 id 兜底） */
function resolveName(memo: RawMemo, id: string): string {
  if (memo.name) return memo.name;
  return id ? `memos/${id}` : "";
}

/** 归一化状态字段：优先 state，回退 rowStatus */
function normalizeState(memo: RawMemo): string | undefined {
  return memo.state ?? memo.rowStatus ?? undefined;
}

/** 把各种时间表示转成 ISO 8601 字符串 */
function toIso(value: string | number | undefined): string | undefined {
  if (value === undefined || value === "") return undefined;
  // 数字时间戳：可能是秒或毫秒
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  // 纯数字字符串同样按时间戳处理
  if (/^\d+$/.test(value)) {
    const num = Number(value);
    const ms = num < 1e12 ? num * 1000 : num;
    return new Date(ms).toISOString();
  }
  // 否则当成日期字符串解析
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function normalizeCreatedAt(memo: RawMemo): string {
  return (
    toIso(memo.createTime) ??
    toIso(memo.create_time) ??
    toIso(memo.createdTs) ??
    toIso(memo.displayTime) ??
    toIso(memo.display_time) ??
    ""
  );
}

function normalizeUpdatedAt(memo: RawMemo): string | undefined {
  return toIso(memo.updateTime) ?? toIso(memo.update_time) ?? toIso(memo.updatedTs);
}

function normalizeResource(raw: RawResource): NormalizedResource {
  return {
    name: raw.name ?? raw.uid ?? "",
    filename: raw.filename,
    type: raw.type,
    size: raw.size,
    externalLink: raw.externalLink ?? raw.external_link,
  };
}

function normalizeResources(memo: RawMemo): NormalizedResource[] | undefined {
  const list = Array.isArray(memo.resources) && memo.resources.length > 0
    ? memo.resources
    : Array.isArray(memo.attachments) && memo.attachments.length > 0
      ? memo.attachments
      : undefined;
  if (!list) return undefined;
  return list.map(normalizeResource);
}

/** 把单个原始 memo 归一化 */
export function normalizeMemo(memo: RawMemo): NormalizedMemo {
  const id = extractId(memo);
  return {
    id,
    name: resolveName(memo, id),
    content: memo.content ?? "",
    visibility: memo.visibility,
    creator: memo.creator,
    tags: Array.isArray(memo.tags) ? memo.tags : [],
    pinned: memo.pinned,
    state: normalizeState(memo),
    createdAt: normalizeCreatedAt(memo),
    updatedAt: normalizeUpdatedAt(memo),
    resources: normalizeResources(memo),
  };
}

/** 把列表响应归一化成 { memos, nextPageToken } */
export function normalizeMemoList(
  response: RawListMemosResponse
): NormalizedMemoPage {
  const memos = Array.isArray(response.memos) ? response.memos : [];
  return {
    memos: memos.map(normalizeMemo),
    nextPageToken: response.nextPageToken ?? response.next_page_token,
  };
}

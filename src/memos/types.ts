/**
 * Memos 数据形状定义。
 *
 * 分两类：
 * - RawMemo / RawResource：上游 Memos API 返回的原始形状（字段可能随版本漂移，
 *   故全部可选、宽松）。仅供 normalize.ts 使用，其余代码不应直接接触。
 * - NormalizedMemo / NormalizedResource：内部稳定形状，全项目统一使用。
 *   即使上游 API 改字段名，也只需改 normalize.ts，上层不受影响。
 */

// ---------------------------------------------------------------------------
// 上游原始形状（宽松，容忍版本差异）
// ---------------------------------------------------------------------------

export interface RawResource {
  name?: string;
  uid?: string;
  filename?: string;
  type?: string;
  size?: string | number;
  externalLink?: string;
  external_link?: string;
  [key: string]: unknown;
}

export interface RawMemo {
  /** 资源名，形如 "memos/123" */
  name?: string;
  /** 旧版本可能直接给数字 id */
  uid?: string;
  id?: string | number;
  content?: string;
  visibility?: string;
  /** 新版本用 state（NORMAL/ARCHIVED）；旧版本可能叫 rowStatus */
  state?: string;
  rowStatus?: string;
  creator?: string;
  pinned?: boolean;
  tags?: string[];
  /** 新版本 camelCase；保留 snake_case 兜底 */
  createTime?: string;
  create_time?: string;
  createdTs?: string | number;
  updateTime?: string;
  update_time?: string;
  updatedTs?: string | number;
  displayTime?: string;
  display_time?: string;
  resources?: RawResource[];
  attachments?: RawResource[];
  [key: string]: unknown;
}

export interface RawListMemosResponse {
  memos?: RawMemo[];
  nextPageToken?: string;
  next_page_token?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// 内部稳定形状
// ---------------------------------------------------------------------------

export interface NormalizedResource {
  name: string;
  filename?: string;
  type?: string;
  size?: string | number;
  externalLink?: string;
}

export interface NormalizedMemo {
  /** 纯数字/字符串 id（从 "memos/123" 中抽出 "123"） */
  id: string;
  /** 资源名，形如 "memos/123"，用于回查 API */
  name: string;
  content: string;
  visibility?: string;
  creator?: string;
  tags: string[];
  pinned?: boolean;
  /** 归一化后的状态：NORMAL / ARCHIVED */
  state?: string;
  /** ISO 8601 字符串 */
  createdAt: string;
  updatedAt?: string;
  resources?: NormalizedResource[];
}

export interface NormalizedMemoPage {
  memos: NormalizedMemo[];
  nextPageToken?: string;
}

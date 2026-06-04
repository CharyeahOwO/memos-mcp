import type { NormalizedMemo } from "../memos/types.js";

/**
 * 工具输出格式化：把内部数据转成 MCP 的 content 结构。
 *
 * MCP tool 返回 { content: [{ type: "text", text }], isError? }。
 * 这里统一文本呈现，并提供 ok/fail 两个包装函数。
 */

export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
  // SDK 的 tool handler 返回类型带索引签名，这里对齐以兼容
  [key: string]: unknown;
}

/** 成功结果：把任意对象序列化为 JSON 文本返回 */
export function ok(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/** 失败结果：返回 isError，不向上 throw */
export function fail(message: string): ToolResult {
  return {
    content: [{ type: "text", text: `错误：${message}` }],
    isError: true,
  };
}

/** 把任意错误转成中文可读字符串（AuthError/MemosApiError 已自带中文信息） */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** 把单条 memo 压成精简对象（去掉 AI 通常用不到的冗余字段） */
export function summarizeMemo(memo: NormalizedMemo): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: memo.id,
    name: memo.name,
    content: memo.content,
    createdAt: memo.createdAt,
  };
  if (memo.visibility) result.visibility = memo.visibility;
  if (memo.tags.length > 0) result.tags = memo.tags;
  if (memo.pinned) result.pinned = memo.pinned;
  if (memo.state) result.state = memo.state;
  if (memo.updatedAt) result.updatedAt = memo.updatedAt;
  if (memo.resources && memo.resources.length > 0) {
    result.resources = memo.resources;
  }
  return result;
}

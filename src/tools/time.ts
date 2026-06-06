import { z } from "zod";
import { errorMessage, fail, ok, summarizeMemo } from "./format.js";
import type { ToolDefinition, ToolDeps } from "./types.js";
import type { NormalizedMemo } from "../memos/types.js";
import { readOnlyTool } from "./annotations.js";

const pageControls = {
  pageSize: z.number().int().min(1).max(200).optional().describe("每页拉取数量，默认 100，最大 200"),
  maxPages: z.number().int().min(1).max(50).optional().describe("最多拉取页数，默认 20，最大 50"),
} satisfies z.ZodRawShape;

const dayInputSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('日历日期，格式 "YYYY-MM-DD"'),
  timezone: z.string().optional().describe("IANA 时区名；不填使用服务器配置的 MEMOS_MCP_TIMEZONE"),
  ...pageControls,
} satisfies z.ZodRawShape;

const rangeInputSchema = {
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('开始日期，格式 "YYYY-MM-DD"，包含当天'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('结束日期，格式 "YYYY-MM-DD"，包含当天'),
  timezone: z.string().optional().describe("IANA 时区名；不填使用服务器配置的 MEMOS_MCP_TIMEZONE"),
  ...pageControls,
} satisfies z.ZodRawShape;

const onThisDayInputSchema = {
  month: z.number().int().min(1).max(12).optional().describe("月份，1-12；不填使用今天所在月份"),
  day: z.number().int().min(1).max(31).optional().describe("日期，1-31；不填使用今天的日期"),
  timezone: z.string().optional().describe("IANA 时区名；不填使用服务器配置的 MEMOS_MCP_TIMEZONE"),
  ...pageControls,
} satisfies z.ZodRawShape;

function resolveTimezone(value: unknown, fallback: string): string {
  const timezone = typeof value === "string" && value.trim() ? value.trim() : fallback;
  // Config 层已经校验默认值；这里校验用户传入值。
  new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  return timezone;
}

function dateParts(date: Date, timezone: string): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day") };
}

function localDateKey(iso: string, timezone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const { year, month, day } = dateParts(date, timezone);
  return `${year}-${month}-${day}`;
}

function monthDay(iso: string, timezone: string): { month: number; day: number } | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  const parts = dateParts(date, timezone);
  return { month: Number(parts.month), day: Number(parts.day) };
}

function readPageControls(args: Record<string, unknown>): { pageSize: number; maxPages: number } {
  return {
    pageSize: typeof args.pageSize === "number" ? args.pageSize : 100,
    maxPages: typeof args.maxPages === "number" ? args.maxPages : 20,
  };
}

async function loadMemoWindow(deps: ToolDeps, args: Record<string, unknown>, extra: never) {
  const client = deps.authResolver.resolveClient(extra);
  const { pageSize, maxPages } = readPageControls(args);
  return client.listAllMemos({
    pageSize,
    maxPages,
    orderBy: "create_time desc",
  });
}

function summarizeWithLocalDate(memo: NormalizedMemo, timezone: string) {
  return {
    ...summarizeMemo(memo),
    localDate: localDateKey(memo.createdAt, timezone),
  };
}

export function createGetDayTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_get_day",
    title: "按日期获取笔记",
    description:
      "按指定时区中的一个日历日获取笔记。适用于用户询问某一天、昨天、今天或指定日期的 memo；日期匹配基于创建时间。",
    annotations: readOnlyTool("按日期获取笔记"),
    inputSchema: dayInputSchema,
    isWrite: false,
    handler: async (args, extra) => {
      try {
        const date = typeof args.date === "string" ? args.date : "";
        if (!date) return fail("缺少参数 date");
        const timezone = resolveTimezone(args.timezone, deps.config.timezone);
        const page = await loadMemoWindow(deps, args, extra as never);
        const memos = page.memos.filter((memo) => localDateKey(memo.createdAt, timezone) === date);
        return ok({
          date,
          timezone,
          memos: memos.map((memo) => summarizeWithLocalDate(memo, timezone)),
          scanned: page.memos.length,
          nextPageToken: page.nextPageToken,
        });
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

export function createGetRangeTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_get_range",
    title: "按日期范围获取笔记",
    description:
      "按指定时区中的日历日期范围获取笔记。适用于用户询问一段时间内的 memo；startDate 和 endDate 都包含当天。",
    annotations: readOnlyTool("按日期范围获取笔记"),
    inputSchema: rangeInputSchema,
    isWrite: false,
    handler: async (args, extra) => {
      try {
        const startDate = typeof args.startDate === "string" ? args.startDate : "";
        const endDate = typeof args.endDate === "string" ? args.endDate : "";
        if (!startDate) return fail("缺少参数 startDate");
        if (!endDate) return fail("缺少参数 endDate");
        if (startDate > endDate) return fail("startDate 不能晚于 endDate");
        const timezone = resolveTimezone(args.timezone, deps.config.timezone);
        const page = await loadMemoWindow(deps, args, extra as never);
        const memos = page.memos.filter((memo) => {
          const key = localDateKey(memo.createdAt, timezone);
          return key >= startDate && key <= endDate;
        });
        return ok({
          startDate,
          endDate,
          timezone,
          memos: memos.map((memo) => summarizeWithLocalDate(memo, timezone)),
          scanned: page.memos.length,
          nextPageToken: page.nextPageToken,
        });
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

export function createOnThisDayTool(deps: ToolDeps): ToolDefinition {
  return {
    name: "memos_on_this_day",
    title: "那年今日",
    description:
      "获取历史上同月同日创建的笔记。适用于用户询问那年今日、历史上的今天或同一天往年记录；不传 month/day 时使用今天。",
    annotations: readOnlyTool("那年今日"),
    inputSchema: onThisDayInputSchema,
    isWrite: false,
    handler: async (args, extra) => {
      try {
        const timezone = resolveTimezone(args.timezone, deps.config.timezone);
        const today = dateParts(new Date(), timezone);
        const month = typeof args.month === "number" ? args.month : Number(today.month);
        const day = typeof args.day === "number" ? args.day : Number(today.day);
        const page = await loadMemoWindow(deps, args, extra as never);
        const memos = page.memos.filter((memo) => {
          const parts = monthDay(memo.createdAt, timezone);
          return parts?.month === month && parts.day === day;
        });
        return ok({
          month,
          day,
          timezone,
          memos: memos.map((memo) => summarizeWithLocalDate(memo, timezone)),
          scanned: page.memos.length,
          nextPageToken: page.nextPageToken,
        });
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };
}

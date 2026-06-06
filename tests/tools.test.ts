import { describe, expect, it } from "vitest";
import { createCreateTool } from "../src/tools/create.js";
import {
  createGetDayTool,
  createGetRangeTool,
  createOnThisDayTool,
} from "../src/tools/time.js";
import { createGetByTagTool, createTagsListTool } from "../src/tools/tags.js";
import { createResourcesListTool } from "../src/tools/resources.js";
import { createArchiveTool, createUpdateTool } from "../src/tools/update.js";
import { createSearchTool } from "../src/tools/search.js";
import { loadConfig } from "../src/config/index.js";
import type { ToolDeps } from "../src/tools/types.js";
import type { NormalizedMemo, NormalizedMemoPage } from "../src/memos/types.js";
import type { AuthResolver } from "../src/auth/resolver.js";
import type { MemosClient } from "../src/memos/client.js";

const memos: NormalizedMemo[] = [
  {
    id: "1",
    name: "memos/1",
    content: "private note",
    visibility: "PRIVATE",
    tags: ["work", "daily"],
    createdAt: "2026-06-06T01:30:00.000Z",
    resources: [{ name: "resources/1", filename: "a.png", type: "image/png", size: 12 }],
  },
  {
    id: "2",
    name: "memos/2",
    content: "public note",
    visibility: "PUBLIC",
    tags: ["work"],
    createdAt: "2025-06-06T12:00:00.000Z",
  },
  {
    id: "3",
    name: "memos/3",
    content: "other day",
    visibility: "PRIVATE",
    tags: ["life"],
    createdAt: "2026-06-07T00:30:00.000Z",
  },
];

function parseResult(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0]?.text ?? "{}") as Record<string, unknown>;
}

function makeDeps(page: NormalizedMemoPage = { memos }): ToolDeps {
  const config = loadConfig({
    MEMOS_BASE_URL: "http://localhost:5230",
    MEMOS_MCP_TRANSPORT: "http",
    MEMOS_MCP_TIMEZONE: "Asia/Shanghai",
  });
  const client = {
    listAllMemos: async () => page,
    searchMemos: async (query: string) => ({
      memos: page.memos.filter((memo) => memo.content.includes(query)),
    }),
    createMemo: async (params: { content: string; visibility: string }) => ({
      id: "9",
      name: "memos/9",
      content: params.content,
      visibility: params.visibility,
      tags: [],
      createdAt: "2026-06-06T00:00:00.000Z",
    }),
    updateMemo: async (params: {
      name: string;
      content?: string;
      visibility?: string;
      pinned?: boolean;
      state?: string;
    }) => ({
      id: params.name.replace(/^memos\//, ""),
      name: params.name.includes("/") ? params.name : `memos/${params.name}`,
      content: params.content ?? "updated",
      visibility: params.visibility ?? "PRIVATE",
      pinned: params.pinned,
      state: params.state ?? "NORMAL",
      tags: [],
      createdAt: "2026-06-06T00:00:00.000Z",
      updatedAt: "2026-06-06T01:00:00.000Z",
    }),
  } as unknown as MemosClient;
  const authResolver = {
    resolve: () => ({ baseUrl: config.memosBaseUrl, token: "test" }),
    resolveClient: () => client,
  } satisfies AuthResolver;
  return { authResolver, config };
}

describe("memos_create", () => {
  it("缺少 visibility 时返回错误，不使用服务端默认值", async () => {
    const tool = createCreateTool(makeDeps());
    const result = await tool.handler({ content: "hello" }, {});
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("缺少参数 visibility");
  });

  it("显式 visibility 时创建 memo", async () => {
    const tool = createCreateTool(makeDeps());
    const result = await tool.handler({ content: "hello", visibility: "PUBLIC" }, {});
    const data = parseResult(result);
    expect(data.visibility).toBe("PUBLIC");
    expect(data.content).toBe("hello");
  });
});

describe("memos_search", () => {
  it("未启用语义搜索时默认使用关键词搜索", async () => {
    const tool = createSearchTool(makeDeps());
    const result = await tool.handler({ query: "private" }, {});
    const data = parseResult(result);
    expect(data.mode).toBe("keyword");
    expect(data.memos).toEqual([expect.objectContaining({ id: "1" })]);
  });
});

describe("update tools", () => {
  it("memos_update 至少需要一个更新字段", async () => {
    const tool = createUpdateTool(makeDeps());
    const result = await tool.handler({ name: "memos/1" }, {});
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("至少需要提供");
  });

  it("memos_update 更新内容和可见性", async () => {
    const tool = createUpdateTool(makeDeps());
    const result = await tool.handler(
      { name: "memos/1", content: "changed", visibility: "PROTECTED", pinned: true },
      {}
    );
    const data = parseResult(result);
    expect(data.name).toBe("memos/1");
    expect(data.content).toBe("changed");
    expect(data.visibility).toBe("PROTECTED");
    expect(data.pinned).toBe(true);
  });

  it("memos_archive 将状态改为 ARCHIVED", async () => {
    const tool = createArchiveTool(makeDeps());
    const result = await tool.handler({ name: "memos/1" }, {});
    const data = parseResult(result);
    expect(data.name).toBe("memos/1");
    expect(data.state).toBe("ARCHIVED");
  });
});

describe("time tools", () => {
  it("memos_get_day 按配置时区匹配日历日", async () => {
    const tool = createGetDayTool(makeDeps());
    const result = await tool.handler({ date: "2026-06-06" }, {});
    const data = parseResult(result);
    expect(data.timezone).toBe("Asia/Shanghai");
    expect(data.scanned).toBe(3);
    expect(data.memos).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "1" })])
    );
  });

  it("memos_get_range 包含起止日期", async () => {
    const tool = createGetRangeTool(makeDeps());
    const result = await tool.handler({ startDate: "2026-06-06", endDate: "2026-06-07" }, {});
    const data = parseResult(result);
    expect(data.memos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "1" }),
        expect.objectContaining({ id: "3" }),
      ])
    );
  });

  it("memos_on_this_day 按月日匹配历史 memo", async () => {
    const tool = createOnThisDayTool(makeDeps());
    const result = await tool.handler({ month: 6, day: 6 }, {});
    const data = parseResult(result);
    expect(data.memos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "1" }),
        expect.objectContaining({ id: "2" }),
      ])
    );
  });
});

describe("tag and resource tools", () => {
  it("memos_get_by_tag 支持带 # 的标签输入", async () => {
    const tool = createGetByTagTool(makeDeps());
    const result = await tool.handler({ tag: "#work" }, {});
    const data = parseResult(result);
    expect(data.memos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "1" }),
        expect.objectContaining({ id: "2" }),
      ])
    );
  });

  it("tags_list 聚合标签数量", async () => {
    const tool = createTagsListTool(makeDeps());
    const result = await tool.handler({}, {});
    const data = parseResult(result);
    expect(data.tags).toEqual(
      expect.arrayContaining([
        { name: "work", count: 2 },
        { name: "daily", count: 1 },
        { name: "life", count: 1 },
      ])
    );
  });

  it("resources_list 返回附件及所属 memo", async () => {
    const tool = createResourcesListTool(makeDeps());
    const result = await tool.handler({}, {});
    const data = parseResult(result);
    expect(data.resources).toEqual([
      expect.objectContaining({
        name: "resources/1",
        filename: "a.png",
        memoId: "1",
        memoName: "memos/1",
      }),
    ]);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { MemosApiError } from "../src/memos/errors.js";
import { MemosClient } from "../src/memos/client.js";

describe("MemosClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updateMemo 使用 PATCH /api/v1/{memo} 和 updateMask", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          name: "memos/1",
          content: "changed",
          visibility: "PROTECTED",
          pinned: true,
          state: "NORMAL",
          createTime: "2026-06-06T00:00:00Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const client = new MemosClient({
      baseUrl: "https://memos.example.com/",
      token: "memos_pat_test",
    });
    const memo = await client.updateMemo({
      name: "memos/1",
      content: "changed",
      visibility: "PROTECTED",
      pinned: true,
    });

    expect(memo.name).toBe("memos/1");
    expect(memo.visibility).toBe("PROTECTED");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://memos.example.com/api/v1/memos/1?updateMask=content%2Cvisibility%2Cpinned"
    );
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "memos/1",
      content: "changed",
      visibility: "PROTECTED",
      pinned: true,
    });
  });

  it("updateMemo 缺少更新字段时抛出可读错误", async () => {
    const client = new MemosClient({
      baseUrl: "https://memos.example.com",
      token: "memos_pat_test",
    });
    await expect(client.updateMemo({ name: "memos/1" })).rejects.toThrow(
      MemosApiError
    );
  });

  it("normalize list 支持 snake_case 分页字段", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          memos: [
            {
              name: "memos/2",
              content: "hello",
              create_time: "2026-06-06T00:00:00Z",
              update_time: "2026-06-06T01:00:00Z",
            },
          ],
          next_page_token: "next",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const client = new MemosClient({
      baseUrl: "https://memos.example.com",
      token: "memos_pat_test",
    });
    const page = await client.listMemos({ pageSize: 1 });

    expect(page.nextPageToken).toBe("next");
    expect(page.memos[0]?.createdAt).toBe("2026-06-06T00:00:00.000Z");
    expect(page.memos[0]?.updatedAt).toBe("2026-06-06T01:00:00.000Z");
  });

  it("getMemo 支持裸 id 并调用资源名 URL", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          name: "memos/123",
          content: "one memo",
          createTime: "2026-06-06T00:00:00Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const client = new MemosClient({
      baseUrl: "https://memos.example.com",
      token: "memos_pat_test",
    });
    const memo = await client.getMemo("123");

    expect(memo.name).toBe("memos/123");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://memos.example.com/api/v1/memos/123"
    );
  });

  it("createMemo 发送 content 和显式 visibility", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          name: "memos/9",
          content: "new memo",
          visibility: "PUBLIC",
          createTime: "2026-06-06T00:00:00Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const client = new MemosClient({
      baseUrl: "https://memos.example.com",
      token: "memos_pat_test",
    });
    const memo = await client.createMemo({ content: "new memo", visibility: "PUBLIC" });

    expect(memo.visibility).toBe("PUBLIC");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://memos.example.com/api/v1/memos");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      content: "new memo",
      visibility: "PUBLIC",
    });
  });

  it("searchMemos 使用 v0.24+ content.contains filter", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ memos: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = new MemosClient({
      baseUrl: "https://memos.example.com",
      token: "memos_pat_test",
    });
    await client.searchMemos("天依", { pageSize: 5 });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/api/v1/memos");
    expect(url.searchParams.get("filter")).toBe('content.contains("天依")');
    expect(url.searchParams.get("pageSize")).toBe("5");
    expect(url.searchParams.get("orderBy")).toBe("create_time desc");
  });

  it("iterMemoPages 按 nextPageToken 翻页并遵守 maxPages", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const parsed = new URL(String(url));
      const pageToken = parsed.searchParams.get("pageToken");
      const body =
        pageToken === "page-2"
          ? {
              memos: [{ name: "memos/2", content: "second" }],
              nextPageToken: "page-3",
            }
          : {
              memos: [{ name: "memos/1", content: "first" }],
              nextPageToken: "page-2",
            };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const client = new MemosClient({
      baseUrl: "https://memos.example.com",
      token: "memos_pat_test",
    });
    const pages = [];
    for await (const page of client.iterMemoPages({ pageSize: 1, maxPages: 2 })) {
      pages.push(page);
    }

    expect(pages).toHaveLength(2);
    expect(pages[0]?.memos[0]?.name).toBe("memos/1");
    expect(pages[1]?.memos[0]?.name).toBe("memos/2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[1]?.[0])).searchParams.get("pageToken")).toBe(
      "page-2"
    );
  });
});

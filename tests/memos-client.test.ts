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
});

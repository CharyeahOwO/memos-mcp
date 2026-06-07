import { describe, expect, it } from "vitest";
import { normalizeMemo, normalizeMemoList } from "../src/memos/normalize.js";

describe("normalizeMemo", () => {
  it("从 memos/123 资源名抽出 id", () => {
    const memo = normalizeMemo({ name: "memos/123", content: "hi" });
    expect(memo.id).toBe("123");
    expect(memo.name).toBe("memos/123");
  });

  it("没有 name 时用 uid/id 兜底并构造资源名", () => {
    expect(normalizeMemo({ uid: "abc", content: "x" }).id).toBe("abc");
    expect(normalizeMemo({ id: 7, content: "x" }).name).toBe("memos/7");
  });

  it("content 缺失时归一化为空字符串", () => {
    expect(normalizeMemo({ name: "memos/1" }).content).toBe("");
  });

  it("tags 缺失时归一化为空数组", () => {
    expect(normalizeMemo({ name: "memos/1" }).tags).toEqual([]);
  });

  it("state 优先于旧字段 rowStatus", () => {
    expect(normalizeMemo({ name: "memos/1", state: "ARCHIVED" }).state).toBe("ARCHIVED");
    expect(normalizeMemo({ name: "memos/1", rowStatus: "NORMAL" }).state).toBe("NORMAL");
  });

  it("createTime(ISO) 归一化为 ISO 字符串", () => {
    const memo = normalizeMemo({ name: "memos/1", createTime: "2026-06-04T10:00:00Z" });
    expect(memo.createdAt).toBe("2026-06-04T10:00:00.000Z");
  });

  it("秒级时间戳归一化为 ISO 字符串", () => {
    const memo = normalizeMemo({ name: "memos/1", createdTs: 1717495200 });
    expect(memo.createdAt).toBe(new Date(1717495200 * 1000).toISOString());
  });

  it("attachments 作为 resources 的兜底来源", () => {
    const memo = normalizeMemo({
      name: "memos/1",
      attachments: [{ name: "resources/9", filename: "a.png" }],
    });
    expect(memo.resources?.[0]?.name).toBe("resources/9");
  });

  it("归一化 v0.24+ camelCase memo 完整字段", () => {
    const memo = normalizeMemo({
      name: "memos/42",
      content: "hello",
      visibility: "PROTECTED",
      creator: "users/1",
      pinned: true,
      state: "NORMAL",
      tags: ["daily", "work"],
      createTime: "2026-06-07T01:02:03Z",
      updateTime: "2026-06-07T04:05:06Z",
      resources: [
        {
          name: "resources/7",
          filename: "note.pdf",
          type: "application/pdf",
          size: 123,
          externalLink: "https://example.com/note.pdf",
        },
      ],
    });

    expect(memo).toEqual(
      expect.objectContaining({
        id: "42",
        name: "memos/42",
        visibility: "PROTECTED",
        creator: "users/1",
        pinned: true,
        state: "NORMAL",
        tags: ["daily", "work"],
        createdAt: "2026-06-07T01:02:03.000Z",
        updatedAt: "2026-06-07T04:05:06.000Z",
      })
    );
    expect(memo.resources).toEqual([
      {
        name: "resources/7",
        filename: "note.pdf",
        type: "application/pdf",
        size: 123,
        externalLink: "https://example.com/note.pdf",
      },
    ]);
  });

  it("空 resources 和空 timestamps 不会产生无效附件", () => {
    const memo = normalizeMemo({
      name: "memos/1",
      createTime: "",
      updateTime: "",
      resources: [],
    });
    expect(memo.createdAt).toBe("");
    expect(memo.updatedAt).toBeUndefined();
    expect(memo.resources).toBeUndefined();
  });
});

describe("normalizeMemoList", () => {
  it("归一化列表并保留 nextPageToken", () => {
    const page = normalizeMemoList({
      memos: [{ name: "memos/1", content: "a" }, { name: "memos/2", content: "b" }],
      nextPageToken: "tok",
    });
    expect(page.memos).toHaveLength(2);
    expect(page.nextPageToken).toBe("tok");
  });

  it("memos 缺失时返回空数组", () => {
    expect(normalizeMemoList({}).memos).toEqual([]);
  });

  it("归一化 snake_case next_page_token", () => {
    const page = normalizeMemoList({
      memos: [{ name: "memos/1" }],
      next_page_token: "snake-next",
    });
    expect(page.nextPageToken).toBe("snake-next");
  });
});

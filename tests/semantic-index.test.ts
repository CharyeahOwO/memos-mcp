import { mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config/index.js";
import { SemanticIndexService, cosineSimilarity } from "../src/indexer/semantic-index.js";
import { createSearchTool } from "../src/tools/search.js";
import { createIndexStatusTool, createSyncIndexTool } from "../src/tools/semantic.js";
import type { AuthResolver } from "../src/auth/resolver.js";
import type { MemosClient } from "../src/memos/client.js";
import type { NormalizedMemo, NormalizedMemoPage } from "../src/memos/types.js";
import type { ToolDeps } from "../src/tools/types.js";

const semanticMemos: NormalizedMemo[] = [
  {
    id: "1",
    name: "memos/1",
    content: "cat kitten feline memory",
    visibility: "PRIVATE",
    tags: ["pets"],
    createdAt: "2026-06-06T00:00:00.000Z",
  },
  {
    id: "2",
    name: "memos/2",
    content: "dog puppy canine note",
    visibility: "PRIVATE",
    tags: ["pets"],
    createdAt: "2026-06-06T00:00:00.000Z",
  },
];

function vectorFor(text: string): number[] {
  if (/cat|kitten|feline/i.test(text)) return [2, 0, 0];
  if (/dog|puppy|canine/i.test(text)) return [0, 3, 0];
  return [0, 0, 4];
}

function mockEmbeddingFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { input?: string[] };
    const input = Array.isArray(body.input) ? body.input : [];
    return new Response(
      JSON.stringify({
        data: input.map((text, index) => ({
          index,
          embedding: vectorFor(text),
        })),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  });
}

async function makeDeps(
  options: {
    env?: NodeJS.ProcessEnv;
    page?: NormalizedMemoPage;
  } = {}
): Promise<{ deps: ToolDeps; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), "memos-mcp-semantic-"));
  const config = loadConfig({
    MEMOS_BASE_URL: "http://localhost:5230",
    MEMOS_MCP_TRANSPORT: "http",
    MEMOS_MCP_EMBEDDING_PROVIDER: "openai-compatible",
    MEMOS_MCP_EMBEDDING_BASE_URL: "http://127.0.0.1:11434/v1",
    MEMOS_MCP_EMBEDDING_MODEL: "test-embedding",
    MEMOS_MCP_INDEX_DB: join(dir, "index.json"),
    ...options.env,
  });
  const page: NormalizedMemoPage = options.page ?? { memos: semanticMemos };
  const client = {
    iterMemoPages: async function* () {
      yield page;
    },
    listAllMemos: async () => page,
    searchMemos: async () => page,
  } as unknown as MemosClient;
  const authResolver = {
    resolve: () => ({ baseUrl: config.memosBaseUrl, token: "test" }),
    resolveClient: () => client,
  } satisfies AuthResolver;
  return {
    deps: { authResolver, config },
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

function parseResult(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0]?.text ?? "{}") as Record<string, unknown>;
}

async function forceStaleIndex(indexPath: string): Promise<void> {
  const indexText = await readFile(indexPath, "utf8");
  const index = JSON.parse(indexText) as Record<string, unknown>;
  index.updatedAt = "2000-01-01T00:00:00.000Z";
  index.testStaleMarker = randomUUID();
  await writeFile(indexPath, `${JSON.stringify(index)}\n`, "utf8");
}

async function writeIndex(
  indexPath: string,
  overrides: Partial<Record<string, unknown>> = {}
): Promise<void> {
  const file = {
    version: 2,
    createdAt: "2026-06-07T00:00:00.000Z",
    updatedAt: "2026-06-07T00:00:00.000Z",
    embeddingProvider: "openai-compatible",
    embeddingModel: "test-embedding",
    dimensions: 3,
    memos: [{ ...semanticMemos[0], embedding: [1, 0, 0] }],
    ...overrides,
  };
  await writeFile(indexPath, `${JSON.stringify(file)}\n`, "utf8");
}

describe("semantic index", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cosineSimilarity 对已归一化向量返回点积", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("同步索引并按语义相似度搜索", async () => {
    mockEmbeddingFetch();
    const { deps, cleanup } = await makeDeps();
    try {
      const service = new SemanticIndexService(deps.config);
      const sync = await service.sync(deps.authResolver.resolveClient({}));
      expect(sync.indexed).toBe(2);
      expect(sync.embedded).toBe(2);
      expect(sync.reused).toBe(0);

      const status = await service.status();
      expect(status.ready).toBe(true);
      expect(status.memoCount).toBe(2);

      const results = await service.search("kitten memory", { limit: 2 });
      expect(results[0]?.memo.name).toBe("memos/1");
      expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
    } finally {
      await cleanup();
    }
  });

  it("同步索引时复用未变化 memo 的 embedding", async () => {
    const fetchMock = mockEmbeddingFetch();
    const { deps, cleanup } = await makeDeps();
    try {
      const service = new SemanticIndexService(deps.config);
      await service.sync(deps.authResolver.resolveClient({}));

      fetchMock.mockClear();
      const sync = await service.sync(deps.authResolver.resolveClient({}));
      expect(sync.indexed).toBe(2);
      expect(sync.embedded).toBe(0);
      expect(sync.reused).toBe(2);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await cleanup();
    }
  });

  it("空 Memos 同步不会调用 embedding 且返回空索引状态", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("embedding should not be called for an empty memo page"));
    const { deps, cleanup } = await makeDeps({ page: { memos: [] } });
    try {
      const service = new SemanticIndexService(deps.config);
      const sync = await service.sync(deps.authResolver.resolveClient({}));
      expect(sync).toEqual(
        expect.objectContaining({
          indexed: 0,
          scanned: 0,
          embedded: 0,
          reused: 0,
          dimensions: 0,
        })
      );
      const status = await service.status();
      expect(status).toEqual(
        expect.objectContaining({
          ready: true,
          memoCount: 0,
          dimensions: 0,
        })
      );
      await expect(service.search("anything")).rejects.toThrow("没有可搜索的 memo");
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await cleanup();
    }
  });

  it("memos_search 语义开启时默认使用 semantic 模式", async () => {
    mockEmbeddingFetch();
    const { deps, cleanup } = await makeDeps();
    try {
      const syncTool = createSyncIndexTool(deps);
      await syncTool.handler({}, {});

      const searchTool = createSearchTool(deps);
      const result = await searchTool.handler({ query: "kitten memory" }, {});
      const data = parseResult(result);
      expect(data.mode).toBe("semantic");
      expect(data.memos).toEqual([
        expect.objectContaining({ name: "memos/1" }),
        expect.objectContaining({ name: "memos/2" }),
      ]);
    } finally {
      await cleanup();
    }
  });

  it("memos_search 在索引缺失时自动同步后搜索", async () => {
    mockEmbeddingFetch();
    const { deps, cleanup } = await makeDeps();
    try {
      const searchTool = createSearchTool(deps);
      const result = await searchTool.handler({ query: "kitten memory" }, {});
      const data = parseResult(result);
      expect(data.mode).toBe("semantic");
      expect(data.index).toEqual(
        expect.objectContaining({
          synced: true,
          reason: "missing",
          expired: false,
          ttlMinutes: 120,
        })
      );
      expect(data.memos).toEqual([
        expect.objectContaining({ name: "memos/1" }),
        expect.objectContaining({ name: "memos/2" }),
      ]);
    } finally {
      await cleanup();
    }
  });

  it("memos_search 在索引过期时自动同步后搜索", async () => {
    const fetchMock = mockEmbeddingFetch();
    const { deps, cleanup } = await makeDeps();
    try {
      await createSyncIndexTool(deps).handler({}, {});

      await forceStaleIndex(deps.config.indexDb);

      fetchMock.mockClear();
      const searchTool = createSearchTool(deps);
      const result = await searchTool.handler({ query: "kitten memory" }, {});
      const data = parseResult(result);
      expect(data.index).toEqual(
        expect.objectContaining({
          synced: true,
          reason: "expired",
          expired: false,
        })
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      await cleanup();
    }
  });

  it("memos_search 在 expiredIndexBehavior=error 时拒绝过期索引", async () => {
    const fetchMock = mockEmbeddingFetch();
    const { deps, cleanup } = await makeDeps({
      env: { MEMOS_MCP_EXPIRED_INDEX_BEHAVIOR: "error" },
    });
    try {
      await createSyncIndexTool(deps).handler({}, {});
      await forceStaleIndex(deps.config.indexDb);
      fetchMock.mockClear();

      const result = await createSearchTool(deps).handler({ query: "kitten memory" }, {});
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("语义索引已过期");
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await cleanup();
    }
  });

  it("memos_search 在 expiredIndexBehavior=allow 时允许使用旧索引", async () => {
    const fetchMock = mockEmbeddingFetch();
    const { deps, cleanup } = await makeDeps({
      env: { MEMOS_MCP_EXPIRED_INDEX_BEHAVIOR: "allow" },
    });
    try {
      await createSyncIndexTool(deps).handler({}, {});
      await forceStaleIndex(deps.config.indexDb);
      fetchMock.mockClear();

      const result = await createSearchTool(deps).handler({ query: "kitten memory" }, {});
      const data = parseResult(result);
      expect(data.index).toEqual(
        expect.objectContaining({
          synced: false,
          reason: "allowed-stale",
          expired: true,
        })
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      await cleanup();
    }
  });

  it("损坏的 JSON 索引返回可读错误", async () => {
    const { deps, cleanup } = await makeDeps();
    try {
      await writeFile(deps.config.indexDb, "{not-json", "utf8");
      const service = new SemanticIndexService(deps.config);
      await expect(service.status()).rejects.toThrow("语义索引文件不是合法 JSON");
    } finally {
      await cleanup();
    }
  });

  it("搜索时拒绝 provider 不一致的索引", async () => {
    mockEmbeddingFetch();
    const { deps, cleanup } = await makeDeps();
    try {
      await writeIndex(deps.config.indexDb, { embeddingProvider: "other-provider" });
      const service = new SemanticIndexService(deps.config);
      await expect(service.search("kitten memory")).rejects.toThrow("embedding provider");
    } finally {
      await cleanup();
    }
  });

  it("搜索时拒绝 model 不一致的索引", async () => {
    mockEmbeddingFetch();
    const { deps, cleanup } = await makeDeps();
    try {
      await writeIndex(deps.config.indexDb, { embeddingModel: "other-model" });
      const service = new SemanticIndexService(deps.config);
      await expect(service.search("kitten memory")).rejects.toThrow("embedding model");
    } finally {
      await cleanup();
    }
  });

  it("搜索时拒绝索引内部向量维度不一致", async () => {
    mockEmbeddingFetch();
    const { deps, cleanup } = await makeDeps();
    try {
      await writeIndex(deps.config.indexDb, {
        dimensions: 3,
        memos: [{ ...semanticMemos[0], embedding: [1, 0] }],
      });
      const service = new SemanticIndexService(deps.config);
      await expect(service.search("kitten memory")).rejects.toThrow("向量维度不一致");
    } finally {
      await cleanup();
    }
  });

  it("读取可解析但缺少 embedding 的损坏索引时返回可读错误", async () => {
    const { deps, cleanup } = await makeDeps();
    try {
      await writeIndex(deps.config.indexDb, {
        memos: [{ ...semanticMemos[0], embedding: undefined }],
      });
      const service = new SemanticIndexService(deps.config);
      await expect(service.status()).rejects.toThrow("memo embedding");
    } finally {
      await cleanup();
    }
  });

  it("读取包含非数字 embedding 的损坏索引时返回可读错误", async () => {
    const { deps, cleanup } = await makeDeps();
    try {
      await writeIndex(deps.config.indexDb, {
        memos: [{ ...semanticMemos[0], embedding: [1, Number.NaN, 0] }],
      });
      const service = new SemanticIndexService(deps.config);
      await expect(service.status()).rejects.toThrow("memo embedding");
    } finally {
      await cleanup();
    }
  });

  it("搜索时拒绝查询 embedding 与索引维度不一致", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ index: 0, embedding: [1, 0] }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const { deps, cleanup } = await makeDeps();
    try {
      await writeIndex(deps.config.indexDb);
      const service = new SemanticIndexService(deps.config);
      await expect(service.search("kitten memory")).rejects.toThrow("查询 embedding 维度");
    } finally {
      await cleanup();
    }
  });

  it("force sync 在 provider/model 未变但维度变化时重建 embedding", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ index: 0, embedding: [1, 0] }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const { deps, cleanup } = await makeDeps({
      page: { memos: [semanticMemos[0] as NormalizedMemo] },
    });
    try {
      await writeIndex(deps.config.indexDb, {
        dimensions: 3,
        memos: [{ ...semanticMemos[0], embedding: [1, 0, 0] }],
      });
      const service = new SemanticIndexService(deps.config);
      const sync = await service.sync(deps.authResolver.resolveClient({}), { force: true });
      expect(sync).toEqual(
        expect.objectContaining({
          embedded: 1,
          reused: 0,
          dimensions: 2,
          force: true,
        })
      );
      const status = await service.status();
      expect(status.dimensions).toBe(2);
    } finally {
      await cleanup();
    }
  });

  it("Embedding API 失败时返回可读错误", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("bad gateway", { status: 502, statusText: "Bad Gateway" })
    );
    const { deps, cleanup } = await makeDeps();
    try {
      const service = new SemanticIndexService(deps.config);
      await expect(service.sync(deps.authResolver.resolveClient({}))).rejects.toThrow(
        "Embedding API 返回错误 502"
      );
    } finally {
      await cleanup();
    }
  });

  it("Embedding API 返回空 embedding 时返回可读错误", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ index: 0, embedding: [] }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const { deps, cleanup } = await makeDeps({
      page: { memos: [semanticMemos[0] as NormalizedMemo] },
    });
    try {
      const service = new SemanticIndexService(deps.config);
      await expect(service.sync(deps.authResolver.resolveClient({}))).rejects.toThrow(
        "空 embedding"
      );
    } finally {
      await cleanup();
    }
  });

  it("Embedding API 返回部分 batch 时返回可读错误", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ index: 0, embedding: [1, 0, 0] }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const { deps, cleanup } = await makeDeps();
    try {
      const service = new SemanticIndexService(deps.config);
      await expect(service.sync(deps.authResolver.resolveClient({}))).rejects.toThrow(
        "数据条数与请求不一致"
      );
    } finally {
      await cleanup();
    }
  });

  it("后续 embedding batch 失败时保留上一版索引文件", async () => {
    let calls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(
          JSON.stringify({
            data: [{ index: 0, embedding: [1, 0, 0] }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const { deps, cleanup } = await makeDeps({
      env: { MEMOS_MCP_EMBEDDING_BATCH_SIZE: "1" },
    });
    try {
      await writeIndex(deps.config.indexDb, {
        updatedAt: "2026-06-01T00:00:00.000Z",
      });
      const service = new SemanticIndexService(deps.config);
      await expect(
        service.sync(deps.authResolver.resolveClient({}), { force: true })
      ).rejects.toThrow("数据条数与请求不一致");
      const persisted = JSON.parse(await readFile(deps.config.indexDb, "utf8")) as {
        updatedAt?: string;
      };
      expect(persisted.updatedAt).toBe("2026-06-01T00:00:00.000Z");
    } finally {
      await cleanup();
    }
  });

  it("Embedding API 返回零向量时返回可读错误", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ index: 0, embedding: [0, 0, 0] }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const { deps, cleanup } = await makeDeps({
      page: { memos: [semanticMemos[0] as NormalizedMemo] },
    });
    try {
      const service = new SemanticIndexService(deps.config);
      await expect(service.sync(deps.authResolver.resolveClient({}))).rejects.toThrow(
        "零向量"
      );
    } finally {
      await cleanup();
    }
  });

  it("syncLocked 并发调用只执行一次底层 sync", async () => {
    const { deps, cleanup } = await makeDeps();
    try {
      const service = new SemanticIndexService(deps.config);
      const syncSpy = vi.spyOn(service, "sync").mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { indexed: 2 };
      });

      const client = deps.authResolver.resolveClient({});
      const [first, second] = await Promise.all([
        service.syncLocked(client),
        service.syncLocked(client),
      ]);

      expect(first).toEqual({ indexed: 2 });
      expect(second).toEqual({ indexed: 2 });
      expect(syncSpy).toHaveBeenCalledTimes(1);
    } finally {
      await cleanup();
    }
  });

  it("syncLocked 失败后清理锁并允许后续重试", async () => {
    const { deps, cleanup } = await makeDeps();
    try {
      const service = new SemanticIndexService(deps.config);
      const syncSpy = vi
        .spyOn(service, "sync")
        .mockRejectedValueOnce(new Error("sync failed"))
        .mockResolvedValueOnce({ indexed: 2 });

      const client = deps.authResolver.resolveClient({});
      const first = service.syncLocked(client);
      const second = service.syncLocked(client);

      await expect(first).rejects.toThrow("sync failed");
      await expect(second).rejects.toThrow("sync failed");
      expect(syncSpy).toHaveBeenCalledTimes(1);

      await expect(service.syncLocked(client)).resolves.toEqual({ indexed: 2 });
      expect(syncSpy).toHaveBeenCalledTimes(2);
    } finally {
      await cleanup();
    }
  });

  it("JSON index cache 在 mtime 和 size 相同但 ctime 变化时重新读取文件", async () => {
    const { deps, cleanup } = await makeDeps();
    try {
      await writeIndex(deps.config.indexDb);
      const service = new SemanticIndexService(deps.config);
      expect((await service.status()).updatedAt).toBe("2026-06-07T00:00:00.000Z");

      const before = await stat(deps.config.indexDb);
      const original = await readFile(deps.config.indexDb, "utf8");
      const changed = original.replaceAll("2026-06-07", "2026-06-08");
      expect(Buffer.byteLength(changed)).toBe(Buffer.byteLength(original));
      await writeFile(deps.config.indexDb, changed, "utf8");
      await utimes(deps.config.indexDb, before.atime, before.mtime);

      expect((await service.status()).updatedAt).toBe("2026-06-08T00:00:00.000Z");
    } finally {
      await cleanup();
    }
  });

  it("memos_index_status 返回索引状态", async () => {
    mockEmbeddingFetch();
    const { deps, cleanup } = await makeDeps();
    try {
      const statusTool = createIndexStatusTool(deps);
      const before = parseResult(await statusTool.handler({}, {}));
      expect(before.ready).toBe(false);

      await createSyncIndexTool(deps).handler({}, {});
      const after = parseResult(await statusTool.handler({}, {}));
      expect(after.ready).toBe(true);
      expect(after.memoCount).toBe(2);
    } finally {
      await cleanup();
    }
  });
});

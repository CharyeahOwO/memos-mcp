import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
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
  if (/cat|kitten|feline/i.test(text)) return [1, 0, 0];
  if (/dog|puppy|canine/i.test(text)) return [0, 1, 0];
  return [0, 0, 1];
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

async function makeDeps(): Promise<{ deps: ToolDeps; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), "memos-mcp-semantic-"));
  const config = loadConfig({
    MEMOS_BASE_URL: "http://localhost:5230",
    MEMOS_MCP_TRANSPORT: "http",
    MEMOS_MCP_ENABLE_SEMANTIC_SEARCH: "true",
    MEMOS_MCP_EMBEDDING_PROVIDER: "openai-compatible",
    MEMOS_MCP_EMBEDDING_BASE_URL: "http://127.0.0.1:11434/v1",
    MEMOS_MCP_EMBEDDING_MODEL: "test-embedding",
    MEMOS_MCP_INDEX_DB: join(dir, "index.json"),
  });
  const page: NormalizedMemoPage = { memos: semanticMemos };
  const client = {
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

describe("semantic index", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cosineSimilarity 返回预期相似度", () => {
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

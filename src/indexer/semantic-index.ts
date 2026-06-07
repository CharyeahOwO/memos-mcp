import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AppConfig } from "../config/index.js";
import type { MemosClient } from "../memos/client.js";
import { MemosApiError } from "../memos/errors.js";
import type { NormalizedMemo } from "../memos/types.js";
import { EmbeddingClient } from "./embeddings.js";

const INDEX_VERSION = 2;

interface IndexCacheEntry {
  ctimeMs: number;
  mtimeMs: number;
  size: number;
  file: SemanticIndexFile;
}

const indexCache = new Map<string, IndexCacheEntry>();

export interface SemanticIndexMemo extends NormalizedMemo {
  embedding: number[];
}

export interface SemanticIndexFile {
  version: number;
  createdAt: string;
  updatedAt: string;
  embeddingProvider: string;
  embeddingModel: string;
  dimensions: number;
  memos: SemanticIndexMemo[];
}

export interface SemanticSearchResult {
  memo: NormalizedMemo;
  score: number;
}

export interface IndexFreshness {
  ready: boolean;
  expired: boolean;
  ttlMinutes: number;
  updatedAt?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
}

export interface IndexMaintenanceResult {
  synced: boolean;
  reason: "fresh" | "missing" | "expired" | "allowed-stale";
  freshness: IndexFreshness;
  syncResult?: Record<string, unknown>;
}

const syncLocks = new Map<string, Promise<Record<string, unknown>>>();

interface SyncParams {
  pageSize?: number;
  maxPages?: number;
  force?: boolean;
}

export class SemanticIndexService {
  private readonly config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  async status(): Promise<Record<string, unknown>> {
    const file = await this.readIndex();
    const freshness = this.freshnessFromFile(file);
    if (!file) {
      return {
        enabled: true,
        ready: false,
        expired: freshness.expired,
        ttlMinutes: freshness.ttlMinutes,
        expiresInSeconds: freshness.expiresInSeconds,
        indexPath: this.config.indexDb,
        memoCount: 0,
        embeddingProvider: this.config.embeddingProvider,
        embeddingModel: this.config.embeddingModel,
      };
    }

    return {
      enabled: true,
      ready: true,
      expired: freshness.expired,
      ttlMinutes: freshness.ttlMinutes,
      expiresAt: freshness.expiresAt,
      expiresInSeconds: freshness.expiresInSeconds,
      indexPath: this.config.indexDb,
      memoCount: file.memos.length,
      updatedAt: file.updatedAt,
      embeddingProvider: file.embeddingProvider,
      embeddingModel: file.embeddingModel,
      dimensions: file.dimensions,
    };
  }

  async freshness(): Promise<IndexFreshness> {
    return this.freshnessFromFile(await this.readIndex());
  }

  async ensureFresh(client: MemosClient): Promise<IndexMaintenanceResult> {
    const freshness = await this.freshness();
    if (!freshness.ready) {
      if (this.config.expiredIndexBehavior !== "sync") {
        throw new MemosApiError("语义索引为空，请先调用 memos_sync_index");
      }
      const syncResult = await this.syncLocked(client);
      return {
        synced: true,
        reason: "missing",
        freshness: await this.freshness(),
        syncResult,
      };
    }

    if (!freshness.expired) {
      return { synced: false, reason: "fresh", freshness };
    }

    if (this.config.expiredIndexBehavior === "allow") {
      return { synced: false, reason: "allowed-stale", freshness };
    }

    if (this.config.expiredIndexBehavior === "error") {
      throw new MemosApiError("语义索引已过期，请先调用 memos_sync_index");
    }

    const syncResult = await this.syncLocked(client);
    return {
      synced: true,
      reason: "expired",
      freshness: await this.freshness(),
      syncResult,
    };
  }

  async syncLocked(
    client: MemosClient,
    params: SyncParams = {}
  ): Promise<Record<string, unknown>> {
    const existing = syncLocks.get(this.config.indexDb);
    if (existing) return existing;

    const promise = this.sync(client, params).finally(() => {
      syncLocks.delete(this.config.indexDb);
    });
    syncLocks.set(this.config.indexDb, promise);
    return promise;
  }

  async sync(
    client: MemosClient,
    params: SyncParams = {}
  ): Promise<Record<string, unknown>> {
    const previousFile = await this.readIndex();
    const force = params.force === true;
    const reusableMemos = force ? new Map<string, SemanticIndexMemo>() : this.reusableMemoMap(previousFile);
    const embeddingClient = new EmbeddingClient(this.config);
    const embedded: SemanticIndexMemo[] = [];
    const pending: NormalizedMemo[] = [];
    let scanned = 0;
    let embeddedCount = 0;
    let reused = 0;
    let pages = 0;
    let nextPageToken: string | undefined;

    const flushPending = async () => {
      if (pending.length === 0) return;
      const batch = pending.splice(0, pending.length);
      const vectors = await embeddingClient.embed(batch.map(embeddingText));
      for (let i = 0; i < batch.length; i += 1) {
        const memo = batch[i];
        const embedding = vectors[i];
        if (!memo || !embedding) continue;
        embedded.push({ ...memo, embedding });
        embeddedCount += 1;
      }
    };

    for await (const page of client.iterMemoPages({
      pageSize: params.pageSize ?? 100,
      maxPages: params.maxPages ?? 20,
      orderBy: "update_time desc",
    })) {
      pages += 1;
      scanned += page.memos.length;
      nextPageToken = page.nextPageToken;

      for (const memo of page.memos) {
        const existing = reusableMemos.get(memo.name);
        if (existing && canReuseEmbedding(existing, memo)) {
          embedded.push({ ...memo, embedding: existing.embedding });
          reused += 1;
          continue;
        }

        pending.push(memo);
        if (pending.length >= this.config.embeddingBatchSize) {
          await flushPending();
        }
      }
    }

    await flushPending();

    const now = new Date().toISOString();
    const file: SemanticIndexFile = {
      version: INDEX_VERSION,
      createdAt: previousFile?.createdAt ?? now,
      updatedAt: now,
      embeddingProvider: this.config.embeddingProvider,
      embeddingModel: this.config.embeddingModel,
      dimensions: embedded[0]?.embedding.length ?? 0,
      memos: embedded,
    };
    await this.writeIndex(file);

    return {
      indexed: embedded.length,
      scanned,
      embedded: embeddedCount,
      reused,
      pages,
      nextPageToken,
      indexPath: this.config.indexDb,
      updatedAt: now,
      dimensions: file.dimensions,
      force,
    };
  }

  async search(
    query: string,
    params: { limit?: number; minScore?: number } = {}
  ): Promise<SemanticSearchResult[]> {
    const file = await this.readIndex();
    if (!file || file.memos.length === 0) {
      throw new MemosApiError("语义索引没有可搜索的 memo；如果 Memos 不为空，请先调用 memos_sync_index");
    }

    this.assertCompatibleIndex(file);
    const embeddingClient = new EmbeddingClient(this.config);
    const [queryEmbedding] = await embeddingClient.embed([query]);
    if (!queryEmbedding) throw new MemosApiError("查询 embedding 失败");
    if (queryEmbedding.length !== file.dimensions) {
      throw new MemosApiError(
        '查询 embedding 维度与语义索引不一致，请调用 memos_sync_index 并传入 {"force": true} 重建索引'
      );
    }

    const minScore = params.minScore ?? -1;
    const limit = params.limit ?? 20;
    return file.memos
      .map((memo) => ({
        memo: stripEmbedding(memo),
        score: cosineSimilarity(queryEmbedding, memo.embedding),
      }))
      .filter((item) => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private assertCompatibleIndex(file: SemanticIndexFile): void {
    if (file.version !== INDEX_VERSION) {
      throw new MemosApiError("语义索引版本不兼容，请重新调用 memos_sync_index");
    }
    if (file.embeddingProvider !== this.config.embeddingProvider) {
      throw new MemosApiError("语义索引的 embedding provider 与当前配置不一致，请重新同步索引");
    }
    if (file.embeddingModel !== this.config.embeddingModel) {
      throw new MemosApiError("语义索引的 embedding model 与当前配置不一致，请重新同步索引");
    }
    if (!Number.isInteger(file.dimensions) || file.dimensions <= 0) {
      throw new MemosApiError("语义索引的向量维度不正确，请重新同步索引");
    }
    if (file.memos.some((memo) => memo.embedding.length !== file.dimensions)) {
      throw new MemosApiError("语义索引内存在向量维度不一致的 memo，请重新同步索引");
    }
  }

  private reusableMemoMap(file: SemanticIndexFile | undefined): Map<string, SemanticIndexMemo> {
    if (
      !file ||
      file.version !== INDEX_VERSION ||
      file.embeddingProvider !== this.config.embeddingProvider ||
      file.embeddingModel !== this.config.embeddingModel
    ) {
      return new Map();
    }
    return new Map(file.memos.map((memo) => [memo.name, memo]));
  }

  private freshnessFromFile(file: SemanticIndexFile | undefined): IndexFreshness {
    if (!file) {
      return {
        ready: false,
        expired: true,
        ttlMinutes: this.config.indexTtlMinutes,
        expiresInSeconds: 0,
      };
    }

    if (this.config.indexTtlMinutes === 0) {
      return {
        ready: true,
        expired: false,
        ttlMinutes: 0,
        updatedAt: file.updatedAt,
      };
    }

    const updatedAtMs = Date.parse(file.updatedAt);
    if (Number.isNaN(updatedAtMs)) {
      return {
        ready: true,
        expired: true,
        ttlMinutes: this.config.indexTtlMinutes,
        updatedAt: file.updatedAt,
        expiresInSeconds: 0,
      };
    }

    const expiresAtMs = updatedAtMs + this.config.indexTtlMinutes * 60_000;
    const remainingMs = expiresAtMs - Date.now();
    return {
      ready: true,
      expired: remainingMs <= 0,
      ttlMinutes: this.config.indexTtlMinutes,
      updatedAt: file.updatedAt,
      expiresAt: new Date(expiresAtMs).toISOString(),
      expiresInSeconds: Math.max(0, Math.ceil(remainingMs / 1000)),
    };
  }

  private async readIndex(): Promise<SemanticIndexFile | undefined> {
    let stats;
    try {
      stats = await stat(this.config.indexDb);
    } catch {
      return undefined;
    }

    const cached = indexCache.get(this.config.indexDb);
    if (
      cached &&
      cached.ctimeMs === stats.ctimeMs &&
      cached.mtimeMs === stats.mtimeMs &&
      cached.size === stats.size
    ) {
      return cached.file;
    }

    const text = await readFile(this.config.indexDb, "utf8");
    let parsed: SemanticIndexFile;
    try {
      parsed = JSON.parse(text) as SemanticIndexFile;
    } catch {
      throw new MemosApiError("语义索引文件不是合法 JSON，请删除或重新调用 memos_sync_index");
    }
    if (!Array.isArray(parsed.memos)) {
      throw new MemosApiError("语义索引文件格式不正确");
    }
    for (const memo of parsed.memos) {
      const embedding = memo?.embedding;
      if (
        !Array.isArray(embedding) ||
        embedding.some((value) => typeof value !== "number" || !Number.isFinite(value))
      ) {
        throw new MemosApiError("语义索引文件格式不正确：memo embedding 必须是数字数组");
      }
    }
    indexCache.set(this.config.indexDb, {
      ctimeMs: stats.ctimeMs,
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      file: parsed,
    });
    return parsed;
  }

  private async writeIndex(file: SemanticIndexFile): Promise<void> {
    await mkdir(dirname(this.config.indexDb), { recursive: true });
    const tempPath = `${this.config.indexDb}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(file)}\n`, "utf8");
    await rename(tempPath, this.config.indexDb);
    const stats = await stat(this.config.indexDb);
    indexCache.set(this.config.indexDb, {
      ctimeMs: stats.ctimeMs,
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      file,
    });
  }
}

function embeddingText(memo: NormalizedMemo): string {
  const tags = memo.tags.length > 0 ? `\nTags: ${memo.tags.map((tag) => `#${tag}`).join(" ")}` : "";
  return `${memo.content}${tags}`;
}

function stripEmbedding(memo: SemanticIndexMemo): NormalizedMemo {
  const { embedding: _embedding, ...rest } = memo;
  return rest;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
  }
  return dot;
}

function canReuseEmbedding(existing: SemanticIndexMemo, memo: NormalizedMemo): boolean {
  return existing.embedding.length > 0 && embeddingText(existing) === embeddingText(memo);
}

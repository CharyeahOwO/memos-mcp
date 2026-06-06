import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AppConfig } from "../config/index.js";
import type { MemosClient } from "../memos/client.js";
import { MemosApiError } from "../memos/errors.js";
import type { NormalizedMemo } from "../memos/types.js";
import { EmbeddingClient } from "./embeddings.js";

const INDEX_VERSION = 1;

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

export class SemanticIndexService {
  private readonly config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  async status(): Promise<Record<string, unknown>> {
    const file = await this.readIndex();
    if (!file) {
      return {
        enabled: true,
        ready: false,
        indexPath: this.config.indexDb,
        memoCount: 0,
        embeddingProvider: this.config.embeddingProvider,
        embeddingModel: this.config.embeddingModel,
      };
    }

    return {
      enabled: true,
      ready: true,
      indexPath: this.config.indexDb,
      memoCount: file.memos.length,
      updatedAt: file.updatedAt,
      embeddingProvider: file.embeddingProvider,
      embeddingModel: file.embeddingModel,
      dimensions: file.dimensions,
    };
  }

  async sync(
    client: MemosClient,
    params: { pageSize?: number; maxPages?: number } = {}
  ): Promise<Record<string, unknown>> {
    const page = await client.listAllMemos({
      pageSize: params.pageSize ?? 100,
      maxPages: params.maxPages ?? 20,
      orderBy: "update_time desc",
    });
    const memos = page.memos;
    const embeddingClient = new EmbeddingClient(this.config);
    const embedded: SemanticIndexMemo[] = [];

    for (let i = 0; i < memos.length; i += this.config.embeddingBatchSize) {
      const batch = memos.slice(i, i + this.config.embeddingBatchSize);
      const vectors = await embeddingClient.embed(batch.map(embeddingText));
      for (let j = 0; j < batch.length; j += 1) {
        const memo = batch[j];
        const embedding = vectors[j];
        if (!memo || !embedding) continue;
        embedded.push({ ...memo, embedding });
      }
    }

    const now = new Date().toISOString();
    const file: SemanticIndexFile = {
      version: INDEX_VERSION,
      createdAt: now,
      updatedAt: now,
      embeddingProvider: this.config.embeddingProvider,
      embeddingModel: this.config.embeddingModel,
      dimensions: embedded[0]?.embedding.length ?? 0,
      memos: embedded,
    };
    await this.writeIndex(file);

    return {
      indexed: embedded.length,
      scanned: memos.length,
      nextPageToken: page.nextPageToken,
      indexPath: this.config.indexDb,
      updatedAt: now,
      dimensions: file.dimensions,
    };
  }

  async search(
    query: string,
    params: { limit?: number; minScore?: number } = {}
  ): Promise<SemanticSearchResult[]> {
    const file = await this.readIndex();
    if (!file || file.memos.length === 0) {
      throw new MemosApiError("语义索引为空，请先调用 memos_sync_index");
    }

    this.assertCompatibleIndex(file);
    const embeddingClient = new EmbeddingClient(this.config);
    const [queryEmbedding] = await embeddingClient.embed([query]);
    if (!queryEmbedding) throw new MemosApiError("查询 embedding 失败");

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
    if (file.embeddingModel !== this.config.embeddingModel) {
      throw new MemosApiError("语义索引的 embedding model 与当前配置不一致，请重新同步索引");
    }
  }

  private async readIndex(): Promise<SemanticIndexFile | undefined> {
    try {
      await stat(this.config.indexDb);
    } catch {
      return undefined;
    }
    const text = await readFile(this.config.indexDb, "utf8");
    const parsed = JSON.parse(text) as SemanticIndexFile;
    if (!Array.isArray(parsed.memos)) {
      throw new MemosApiError("语义索引文件格式不正确");
    }
    return parsed;
  }

  private async writeIndex(file: SemanticIndexFile): Promise<void> {
    await mkdir(dirname(this.config.indexDb), { recursive: true });
    const tempPath = `${this.config.indexDb}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(tempPath, this.config.indexDb);
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
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

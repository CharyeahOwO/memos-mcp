import type { AppConfig } from "../config/index.js";
import { MemosApiError } from "../memos/errors.js";

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[]; index?: number }>;
  [key: string]: unknown;
}

export class EmbeddingClient {
  private readonly endpoint: string;
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(config: AppConfig) {
    if (!config.embeddingBaseUrl || !config.embeddingModel) {
      throw new MemosApiError("语义搜索未配置 embedding base URL 或 model");
    }
    const baseUrl = config.embeddingBaseUrl.replace(/\/+$/, "");
    this.endpoint = baseUrl.endsWith("/embeddings")
      ? baseUrl
      : `${baseUrl}/embeddings`;
    this.apiKey = config.embeddingApiKey;
    this.model = config.embeddingModel;
  }

  async embed(input: string[]): Promise<number[][]> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        input,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new MemosApiError(
        `Embedding API 返回错误 ${response.status}：${body.trim() || response.statusText}`,
        response.status
      );
    }

    const json = (await response.json()) as EmbeddingResponse;
    const rows = json.data;
    if (!Array.isArray(rows) || rows.length !== input.length) {
      throw new MemosApiError("Embedding API 返回的数据条数与请求不一致");
    }

    return rows
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((row) => {
        if (!Array.isArray(row.embedding) || row.embedding.length === 0) {
          throw new MemosApiError("Embedding API 返回了空 embedding");
        }
        return row.embedding;
      });
  }
}

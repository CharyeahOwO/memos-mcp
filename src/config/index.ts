import { z } from "zod";

/**
 * 配置层：全项目唯一读取环境变量的地方。
 *
 * 设计要点：
 * - 用 zod 严格校验，非法值直接报友好中文错误并退出，不静默兜底。
 * - 条件校验：stdio 模式必须有 access token；本地 http 模式不强制
 *   （本地 HTTP 客户端可在请求头自带 token，见 auth/resolver.ts）。
 */

export const TRANSPORTS = ["stdio", "http"] as const;
export type Transport = (typeof TRANSPORTS)[number];

export const VISIBILITIES = ["PRIVATE", "PROTECTED", "PUBLIC"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const EMBEDDING_PROVIDERS = ["openai-compatible"] as const;
export type EmbeddingProvider = (typeof EMBEDDING_PROVIDERS)[number];

export const EXPIRED_INDEX_BEHAVIORS = ["sync", "error", "allow"] as const;
export type ExpiredIndexBehavior = (typeof EXPIRED_INDEX_BEHAVIORS)[number];

/** 把 "true"/"false"/"1"/"0" 等字符串解析成布尔值 */
const booleanFromString = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return defaultValue;
      return ["1", "true", "yes", "on"].includes(value.toLowerCase());
    });

const integerFromString = (
  defaultValue: number,
  name: string,
  min: number,
  max: number
) =>
  z
    .string()
    .default(String(defaultValue))
    .transform((value, ctx) => {
      const number = Number(value);
      if (!Number.isInteger(number) || number < min || number > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${name} 必须是 ${min}-${max} 之间的整数`,
        });
        return z.NEVER;
      }
      return number;
    });

const RawConfigSchema = z.object({
  MEMOS_BASE_URL: z
    .string({ required_error: "缺少 MEMOS_BASE_URL（你的 Memos 实例地址）" })
    .url("MEMOS_BASE_URL 必须是合法的 URL，例如 http://localhost:5230")
    // 去掉结尾斜杠，统一成不带斜杠的形式
    .transform((value) => value.replace(/\/+$/, "")),

  MEMOS_ACCESS_TOKEN: z.string().optional(),

  MEMOS_MCP_TRANSPORT: z
    .enum(TRANSPORTS, {
      errorMap: () => ({ message: "MEMOS_MCP_TRANSPORT 只能是 stdio 或 http" }),
    })
    .default("stdio"),

  MEMOS_MCP_HOST: z.string().default("127.0.0.1"),

  MEMOS_MCP_PORT: z
    .string()
    .default("8080")
    .transform((value, ctx) => {
      const port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MEMOS_MCP_PORT 必须是 1-65535 之间的整数",
        });
        return z.NEVER;
      }
      return port;
    }),

  MEMOS_MCP_READONLY: booleanFromString(false),

  MEMOS_MCP_ENABLE_UPDATE_TOOLS: booleanFromString(false),

  MEMOS_MCP_INDEX_DB: z.string().default("./data/memos-mcp-index.json"),

  MEMOS_MCP_EMBEDDING_PROVIDER: z.enum(EMBEDDING_PROVIDERS).default("openai-compatible"),

  MEMOS_MCP_EMBEDDING_BASE_URL: z
    .string({
      required_error: "缺少 MEMOS_MCP_EMBEDDING_BASE_URL（OpenAI-compatible embeddings 地址）",
    })
    .url("MEMOS_MCP_EMBEDDING_BASE_URL 必须是合法 URL，例如 http://127.0.0.1:11434/v1")
    .transform((value) => value?.replace(/\/+$/, "")),

  MEMOS_MCP_EMBEDDING_API_KEY: z.string().optional(),

  MEMOS_MCP_EMBEDDING_MODEL: z
    .string({
      required_error: "缺少 MEMOS_MCP_EMBEDDING_MODEL",
    })
    .min(1, "MEMOS_MCP_EMBEDDING_MODEL 不能为空"),

  MEMOS_MCP_EMBEDDING_BATCH_SIZE: z
    .string()
    .default("32")
    .transform((value, ctx) => {
      const size = Number(value);
      if (!Number.isInteger(size) || size < 1 || size > 128) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MEMOS_MCP_EMBEDDING_BATCH_SIZE 必须是 1-128 之间的整数",
        });
        return z.NEVER;
      }
      return size;
    }),

  MEMOS_MCP_INDEX_TTL_MINUTES: integerFromString(
    120,
    "MEMOS_MCP_INDEX_TTL_MINUTES",
    0,
    10080
  ),

  MEMOS_MCP_EXPIRED_INDEX_BEHAVIOR: z
    .enum(EXPIRED_INDEX_BEHAVIORS, {
      errorMap: () => ({
        message: "MEMOS_MCP_EXPIRED_INDEX_BEHAVIOR 只能是 sync、error 或 allow",
      }),
    })
    .default("sync"),

  MEMOS_MCP_SYNC_INTERVAL_MINUTES: integerFromString(
    120,
    "MEMOS_MCP_SYNC_INTERVAL_MINUTES",
    0,
    10080
  ),

  MEMOS_MCP_SYNC_ON_START: booleanFromString(true),

  MEMOS_MCP_TIMEZONE: z
    .string()
    .default("UTC")
    .superRefine((value, ctx) => {
      // 用 Intl 校验时区名是否合法
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `MEMOS_MCP_TIMEZONE 不是合法的时区名（如 UTC、Asia/Shanghai），收到：${value}`,
        });
      }
    }),

  MEMOS_MCP_MEMOS_API_VERSION: z.string().optional(),
});

/** 解析后的强类型配置 */
export interface AppConfig {
  memosBaseUrl: string;
  /** stdio 模式下的 token；http 模式可能为 undefined */
  memosAccessToken: string | undefined;
  transport: Transport;
  host: string;
  port: number;
  readonly: boolean;
  enableUpdateTools: boolean;
  indexDb: string;
  embeddingProvider: EmbeddingProvider;
  embeddingBaseUrl: string;
  embeddingApiKey: string | undefined;
  embeddingModel: string;
  embeddingBatchSize: number;
  indexTtlMinutes: number;
  expiredIndexBehavior: ExpiredIndexBehavior;
  syncIntervalMinutes: number;
  syncOnStart: boolean;
  timezone: string;
  memosApiVersion: string | undefined;
}

/** 配置错误：携带人类可读的中文信息，供入口统一打印 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * 从给定的环境变量对象解析配置。默认读 process.env，测试时可传入自定义对象。
 * 校验失败抛 ConfigError（信息已是中文）。
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = RawConfigSchema.safeParse(env);

  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => `  - ${issue.message}`);
    throw new ConfigError(`配置校验失败：\n${lines.join("\n")}`);
  }

  const raw = parsed.data;

  // 条件校验：stdio 模式必须有 token
  if (raw.MEMOS_MCP_TRANSPORT === "stdio" && !raw.MEMOS_ACCESS_TOKEN) {
    throw new ConfigError(
      "配置校验失败：\n  - stdio 模式必须设置 MEMOS_ACCESS_TOKEN（服务器用它去连你的 Memos）。\n" +
        "    如果你想用 http 模式让本地客户端通过请求头提供 token，请设 MEMOS_MCP_TRANSPORT=http。"
    );
  }

  return {
    memosBaseUrl: raw.MEMOS_BASE_URL,
    memosAccessToken: raw.MEMOS_ACCESS_TOKEN,
    transport: raw.MEMOS_MCP_TRANSPORT,
    host: raw.MEMOS_MCP_HOST,
    port: raw.MEMOS_MCP_PORT,
    readonly: raw.MEMOS_MCP_READONLY,
    enableUpdateTools: raw.MEMOS_MCP_ENABLE_UPDATE_TOOLS,
    indexDb: raw.MEMOS_MCP_INDEX_DB,
    embeddingProvider: raw.MEMOS_MCP_EMBEDDING_PROVIDER,
    embeddingBaseUrl: raw.MEMOS_MCP_EMBEDDING_BASE_URL,
    embeddingApiKey: raw.MEMOS_MCP_EMBEDDING_API_KEY,
    embeddingModel: raw.MEMOS_MCP_EMBEDDING_MODEL,
    embeddingBatchSize: raw.MEMOS_MCP_EMBEDDING_BATCH_SIZE,
    indexTtlMinutes: raw.MEMOS_MCP_INDEX_TTL_MINUTES,
    expiredIndexBehavior: raw.MEMOS_MCP_EXPIRED_INDEX_BEHAVIOR,
    syncIntervalMinutes: raw.MEMOS_MCP_SYNC_INTERVAL_MINUTES,
    syncOnStart: raw.MEMOS_MCP_SYNC_ON_START,
    timezone: raw.MEMOS_MCP_TIMEZONE,
    memosApiVersion: raw.MEMOS_MCP_MEMOS_API_VERSION,
  };
}

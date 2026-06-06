import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/config/index.js";

const base = { MEMOS_BASE_URL: "http://localhost:5230" };

describe("loadConfig", () => {
  it("缺少 MEMOS_BASE_URL 报错", () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
  });

  it("非法 URL 被拒", () => {
    expect(() => loadConfig({ MEMOS_BASE_URL: "not-a-url", MEMOS_ACCESS_TOKEN: "t" })).toThrow(
      ConfigError
    );
  });

  it("结尾斜杠被去掉", () => {
    const cfg = loadConfig({
      MEMOS_BASE_URL: "http://localhost:5230/",
      MEMOS_ACCESS_TOKEN: "memos_pat_x",
    });
    expect(cfg.memosBaseUrl).toBe("http://localhost:5230");
  });

  it("stdio 模式缺 token 报错", () => {
    expect(() => loadConfig({ ...base })).toThrow(ConfigError);
  });

  it("stdio 模式有 token 通过", () => {
    const cfg = loadConfig({ ...base, MEMOS_ACCESS_TOKEN: "memos_pat_x" });
    expect(cfg.transport).toBe("stdio");
    expect(cfg.memosAccessToken).toBe("memos_pat_x");
  });

  it("http 模式不强制 token", () => {
    const cfg = loadConfig({ ...base, MEMOS_MCP_TRANSPORT: "http" });
    expect(cfg.transport).toBe("http");
    expect(cfg.memosAccessToken).toBeUndefined();
  });

  it("非法 transport 被拒", () => {
    expect(() => loadConfig({ ...base, MEMOS_MCP_TRANSPORT: "grpc" })).toThrow(ConfigError);
  });

  it("默认值正确", () => {
    const cfg = loadConfig({ ...base, MEMOS_MCP_TRANSPORT: "http" });
    expect(cfg.host).toBe("127.0.0.1");
    expect(cfg.port).toBe(8080);
    expect(cfg.readonly).toBe(false);
    expect(cfg.enableUpdateTools).toBe(false);
    expect(cfg.enableSemanticSearch).toBe(false);
    expect(cfg.embeddingProvider).toBe("disabled");
    expect(cfg.timezone).toBe("UTC");
  });

  it("readonly 字符串解析为布尔", () => {
    const cfg = loadConfig({ ...base, MEMOS_MCP_TRANSPORT: "http", MEMOS_MCP_READONLY: "true" });
    expect(cfg.readonly).toBe(true);
  });

  it("update 工具开关字符串解析为布尔", () => {
    const cfg = loadConfig({
      ...base,
      MEMOS_MCP_TRANSPORT: "http",
      MEMOS_MCP_ENABLE_UPDATE_TOOLS: "true",
    });
    expect(cfg.enableUpdateTools).toBe(true);
  });

  it("启用语义搜索时要求 embedding 配置", () => {
    expect(() =>
      loadConfig({
        ...base,
        MEMOS_MCP_TRANSPORT: "http",
        MEMOS_MCP_ENABLE_SEMANTIC_SEARCH: "true",
      })
    ).toThrow(ConfigError);
  });

  it("语义搜索配置完整时通过", () => {
    const cfg = loadConfig({
      ...base,
      MEMOS_MCP_TRANSPORT: "http",
      MEMOS_MCP_ENABLE_SEMANTIC_SEARCH: "true",
      MEMOS_MCP_EMBEDDING_PROVIDER: "openai-compatible",
      MEMOS_MCP_EMBEDDING_BASE_URL: "http://127.0.0.1:11434/v1/",
      MEMOS_MCP_EMBEDDING_MODEL: "nomic-embed-text",
      MEMOS_MCP_INDEX_DB: "./data/test-index.json",
    });
    expect(cfg.enableSemanticSearch).toBe(true);
    expect(cfg.embeddingBaseUrl).toBe("http://127.0.0.1:11434/v1");
    expect(cfg.embeddingModel).toBe("nomic-embed-text");
  });

  it("非法端口被拒", () => {
    expect(() =>
      loadConfig({ ...base, MEMOS_MCP_TRANSPORT: "http", MEMOS_MCP_PORT: "99999" })
    ).toThrow(ConfigError);
  });

  it("非法时区被拒", () => {
    expect(() =>
      loadConfig({ ...base, MEMOS_MCP_TRANSPORT: "http", MEMOS_MCP_TIMEZONE: "Mars/Phobos" })
    ).toThrow(ConfigError);
  });

  it("合法时区通过", () => {
    const cfg = loadConfig({
      ...base,
      MEMOS_MCP_TRANSPORT: "http",
      MEMOS_MCP_TIMEZONE: "Asia/Shanghai",
    });
    expect(cfg.timezone).toBe("Asia/Shanghai");
  });
});

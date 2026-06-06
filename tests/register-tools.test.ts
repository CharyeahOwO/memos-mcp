import { describe, expect, it } from "vitest";
import { registerTools } from "../src/server/register-tools.js";
import { createAuthResolver } from "../src/auth/resolver.js";
import { loadConfig } from "../src/config/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/** 最小假 server，只记录注册过的工具名 */
function makeFakeServer() {
  const names: string[] = [];
  const fake = {
    registerTool(name: string) {
      names.push(name);
    },
  };
  return { server: fake as unknown as McpServer, names };
}

function deps(
  options: {
    readonly?: boolean;
    enableUpdateTools?: boolean;
    enableSemanticSearch?: boolean;
  } = {}
) {
  const config = loadConfig({
    MEMOS_BASE_URL: "http://localhost:5230",
    MEMOS_MCP_TRANSPORT: "http",
    MEMOS_MCP_READONLY: options.readonly ? "true" : "false",
    MEMOS_MCP_ENABLE_UPDATE_TOOLS: options.enableUpdateTools ? "true" : "false",
    MEMOS_MCP_ENABLE_SEMANTIC_SEARCH: options.enableSemanticSearch ? "true" : "false",
    MEMOS_MCP_EMBEDDING_PROVIDER: options.enableSemanticSearch
      ? "openai-compatible"
      : "disabled",
    MEMOS_MCP_EMBEDDING_BASE_URL: options.enableSemanticSearch
      ? "http://127.0.0.1:11434/v1"
      : undefined,
    MEMOS_MCP_EMBEDDING_MODEL: options.enableSemanticSearch
      ? "nomic-embed-text"
      : undefined,
  });
  return { authResolver: createAuthResolver(config), config };
}

describe("registerTools 权限网关", () => {
  it("默认注册全部基础工具", () => {
    const { server, names } = makeFakeServer();
    const registered = registerTools(server, deps());
    expect(registered).toHaveLength(10);
    expect(names).toContain("memos_create");
    expect(names).toContain("memos_list");
    expect(names).toContain("memos_get");
    expect(names).toContain("memos_search");
    expect(names).toContain("memos_get_day");
    expect(names).toContain("memos_get_range");
    expect(names).toContain("memos_on_this_day");
    expect(names).toContain("memos_get_by_tag");
    expect(names).toContain("tags_list");
    expect(names).toContain("resources_list");
    expect(names).not.toContain("memos_update");
    expect(names).not.toContain("memos_archive");
    expect(names).not.toContain("memos_sync_index");
    expect(names).not.toContain("memos_index_status");
  });

  it("只读模式下隐藏写工具 memos_create", () => {
    const { server, names } = makeFakeServer();
    const registered = registerTools(server, deps({ readonly: true }));
    expect(registered).toHaveLength(9);
    expect(names).not.toContain("memos_create");
    expect(names).not.toContain("memos_update");
    expect(names).not.toContain("memos_archive");
    expect(names).toContain("memos_list");
    expect(names).toContain("resources_list");
  });

  it("显式开启后注册 update/archive 工具", () => {
    const { server, names } = makeFakeServer();
    const registered = registerTools(server, deps({ enableUpdateTools: true }));
    expect(registered).toHaveLength(12);
    expect(names).toContain("memos_create");
    expect(names).toContain("memos_update");
    expect(names).toContain("memos_archive");
  });

  it("只读模式优先于 update/archive 开关", () => {
    const { server, names } = makeFakeServer();
    const registered = registerTools(
      server,
      deps({ readonly: true, enableUpdateTools: true })
    );
    expect(registered).toHaveLength(9);
    expect(names).not.toContain("memos_create");
    expect(names).not.toContain("memos_update");
    expect(names).not.toContain("memos_archive");
  });

  it("显式开启语义搜索后注册索引工具", () => {
    const { server, names } = makeFakeServer();
    const registered = registerTools(server, deps({ enableSemanticSearch: true }));
    expect(registered).toHaveLength(12);
    expect(names).toContain("memos_search");
    expect(names).toContain("memos_sync_index");
    expect(names).toContain("memos_index_status");
  });
});

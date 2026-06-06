import { describe, expect, it } from "vitest";
import { registerTools } from "../src/server/register-tools.js";
import { createAuthResolver } from "../src/auth/resolver.js";
import { loadConfig } from "../src/config/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/** 最小假 server，只记录注册过的工具名 */
function makeFakeServer() {
  const names: string[] = [];
  const configs = new Map<string, Record<string, unknown>>();
  const fake = {
    registerTool(name: string, config: Record<string, unknown>) {
      names.push(name);
      configs.set(name, config);
    },
  };
  return { server: fake as unknown as McpServer, names, configs };
}

function deps(
  options: {
    readonly?: boolean;
    enableUpdateTools?: boolean;
  } = {}
) {
  const config = loadConfig({
    MEMOS_BASE_URL: "http://localhost:5230",
    MEMOS_MCP_TRANSPORT: "http",
    MEMOS_MCP_READONLY: options.readonly ? "true" : "false",
    MEMOS_MCP_ENABLE_UPDATE_TOOLS: options.enableUpdateTools ? "true" : "false",
    MEMOS_MCP_EMBEDDING_PROVIDER: "openai-compatible",
    MEMOS_MCP_EMBEDDING_BASE_URL: "http://127.0.0.1:11434/v1",
    MEMOS_MCP_EMBEDDING_MODEL: "nomic-embed-text",
  });
  return { authResolver: createAuthResolver(config), config };
}

describe("registerTools 权限网关", () => {
  it("默认注册检索和语义索引工具", () => {
    const { server, names } = makeFakeServer();
    const registered = registerTools(server, deps());
    expect(registered).toHaveLength(12);
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
    expect(names).toContain("memos_sync_index");
    expect(names).toContain("memos_index_status");
  });

  it("只读模式下隐藏写工具 memos_create", () => {
    const { server, names } = makeFakeServer();
    const registered = registerTools(server, deps({ readonly: true }));
    expect(registered).toHaveLength(11);
    expect(names).not.toContain("memos_create");
    expect(names).not.toContain("memos_update");
    expect(names).not.toContain("memos_archive");
    expect(names).toContain("memos_list");
    expect(names).toContain("resources_list");
    expect(names).toContain("memos_sync_index");
    expect(names).toContain("memos_index_status");
  });

  it("显式开启后注册 update/archive 工具", () => {
    const { server, names } = makeFakeServer();
    const registered = registerTools(server, deps({ enableUpdateTools: true }));
    expect(registered).toHaveLength(14);
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
    expect(registered).toHaveLength(11);
    expect(names).not.toContain("memos_create");
    expect(names).not.toContain("memos_update");
    expect(names).not.toContain("memos_archive");
  });

  it("默认注册索引工具", () => {
    const { server, names } = makeFakeServer();
    const registered = registerTools(server, deps());
    expect(registered).toHaveLength(12);
    expect(names).toContain("memos_search");
    expect(names).toContain("memos_sync_index");
    expect(names).toContain("memos_index_status");
  });

  it("向 SDK 注册工具行为 annotations", () => {
    const { server, configs } = makeFakeServer();
    registerTools(server, deps());

    expect(configs.get("memos_search")?.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    });
    expect(configs.get("memos_create")?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    });
    expect(configs.get("memos_sync_index")?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    });
  });
});

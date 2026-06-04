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

function deps(readonly: boolean) {
  const config = loadConfig({
    MEMOS_BASE_URL: "http://localhost:5230",
    MEMOS_MCP_TRANSPORT: "http",
    MEMOS_MCP_READONLY: readonly ? "true" : "false",
  });
  return { authResolver: createAuthResolver(config), config };
}

describe("registerTools 权限网关", () => {
  it("默认注册全部 4 个工具", () => {
    const { server, names } = makeFakeServer();
    const registered = registerTools(server, deps(false));
    expect(registered).toHaveLength(4);
    expect(names).toContain("memos_create");
    expect(names).toContain("memos_list");
    expect(names).toContain("memos_get");
    expect(names).toContain("memos_search");
  });

  it("只读模式下隐藏写工具 memos_create", () => {
    const { server, names } = makeFakeServer();
    const registered = registerTools(server, deps(true));
    expect(registered).toHaveLength(3);
    expect(names).not.toContain("memos_create");
    expect(names).toContain("memos_list");
  });
});

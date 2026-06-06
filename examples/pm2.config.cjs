module.exports = {
  apps: [
    {
      name: "memos-mcp",
      cwd: "/opt/memos-mcp",
      script: "dist/index.js",
      interpreter: "node",
      env: {
        MEMOS_BASE_URL: "http://127.0.0.1:5230",
        MEMOS_MCP_TRANSPORT: "http",
        MEMOS_MCP_HOST: "127.0.0.1",
        MEMOS_MCP_PORT: "8080",
        MEMOS_MCP_READONLY: "false",
        MEMOS_MCP_ENABLE_UPDATE_TOOLS: "false",
        MEMOS_MCP_TIMEZONE: "UTC",
      },
    },
  ],
};

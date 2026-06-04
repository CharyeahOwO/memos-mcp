import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  dts: false,
  sourcemap: true,
  // 入口加 shebang，构建后可直接作为 CLI 执行（为第三步 npx 预留）
  banner: {
    js: "#!/usr/bin/env node",
  },
});

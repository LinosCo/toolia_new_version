import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    env: {
      NODE_ENV: "test",
    },
    // Run test files sequentially — required because all API tests share a
    // single Postgres test DB and call resetDb() between tests.
    // `singleThread: true` was silently dropped in Vitest 4; use the options
    // below instead. `fileParallelism: false` is the key fix.
    fileParallelism: false,
    isolate: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/app/api/**"],
      exclude: ["**/*.d.ts", "**/generated/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

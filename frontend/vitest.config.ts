import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: false,
    testTimeout: 10000,
    // Playwright owns e2e/ — keep the runners from collecting each other's suites.
    include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
  },
});

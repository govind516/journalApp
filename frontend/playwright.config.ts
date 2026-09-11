import { defineConfig } from "@playwright/test";

// Serial by design: specs share the backend's in-memory auth rate-limit
// budget (single gateway IP), so they run alphabetically and later specs
// must be budget-aware — rate-limit.spec.ts is last and self-calibrating.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
});

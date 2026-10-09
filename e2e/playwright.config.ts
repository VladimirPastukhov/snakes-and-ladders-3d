import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL;
if (!baseURL) {
  throw new Error("BASE_URL must be set, e.g. BASE_URL=http://localhost:8787 pnpm smoke");
}

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

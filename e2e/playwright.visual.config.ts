import { defineConfig, devices } from "@playwright/test";

// Visual checks run against `pnpm dev`, the only build that has the `window.__board` debug hook.
export default defineConfig({
  testDir: "./visual",
  testMatch: "**/*.visual.ts",
  timeout: 60_000,
  reporter: "list",
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:5173" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: ["--enable-unsafe-swiftshader"] },
      },
    },
  ],
});

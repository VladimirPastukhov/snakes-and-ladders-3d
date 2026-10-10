import { expect, test } from "@playwright/test";

const GAME_TITLE = "Snakes & Ladders: The Yellow Brick Road";
const expectedVersion = process.env.EXPECTED_VERSION ?? "dev";

test("health endpoint reports the expected version", async ({ request }) => {
  // A fresh deploy can take a few seconds to reach every edge location.
  await expect
    .poll(
      async () => {
        const response = await request.get("/api/health");
        return response.ok() ? (await response.json()).version : `HTTP ${response.status()}`;
      },
      { timeout: 60_000, intervals: [2_000] },
    )
    .toBe(expectedVersion);
});

test("game page loads with title and version", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: GAME_TITLE })).toBeVisible();
  await expect(page.getByText(`Version: ${expectedVersion}`)).toBeVisible();
});

test("the 3D Board finishes drawing", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-board-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a Match-style deep link loads the game page", async ({ page }) => {
  const response = await page.goto("/m/K7QX");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: GAME_TITLE })).toBeVisible();
});

test("missing files and unknown API paths return 404", async ({ request }) => {
  expect((await request.get("/assets/missing.js")).status()).toBe(404);
  expect((await request.get("/api/nope")).status()).toBe(404);
});

import { expect, test, type Page } from "@playwright/test";

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
  const response = await page.goto("/m/K7QXM");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: GAME_TITLE })).toBeVisible();
});

test("missing files and unknown API paths return 404", async ({ request }) => {
  expect((await request.get("/assets/missing.js")).status()).toBe(404);
  expect((await request.get("/api/nope")).status()).toBe(404);
});

// Creates a real (tiny) Match in production on every deploy; M6 adds deleting old Matches.
test("two browser sessions meet in a Match", async ({ browser }) => {
  const alexContext = await browser.newContext();
  const samContext = await browser.newContext();
  const alex = await alexContext.newPage();
  const sam = await samContext.newPage();
  const seat = (page: Page, name: string) => page.locator(`[data-seat="${name}"]`);

  await alex.goto("/");
  await alex.getByLabel("Your name").fill("Smoke Alex");
  await alex.getByRole("button", { name: "New Match" }).click();
  await expect(alex).toHaveURL(/\/m\/[2-9A-HJKMNP-Z]{5}$/);
  const link = await alex.getByLabel("Invite link").inputValue();

  await sam.goto(link);
  await sam.getByLabel("Your name").fill("Smoke Sam");
  await sam.getByRole("button", { name: "Join" }).click();

  for (const page of [alex, sam]) {
    await expect(seat(page, "creator")).toContainText("Smoke Alex");
    await expect(seat(page, "joiner")).toContainText("Smoke Sam");
    for (const name of ["creator", "joiner"]) {
      await expect(seat(page, name).getByText("connected", { exact: true })).toBeVisible();
    }
  }

  await alexContext.close();
  await samContext.close();
});

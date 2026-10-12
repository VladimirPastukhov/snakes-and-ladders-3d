import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

// Two Players in separate browser contexts (separate storage, like two devices).

const PHONE = { width: 390, height: 844 };

async function newPlayer(browser: Browser): Promise<[BrowserContext, Page]> {
  const context = await browser.newContext({
    viewport: PHONE,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  return [context, await context.newPage()];
}

type TokenSpot = { seat: string; cell: number };

const tokens = (page: Page) =>
  page.evaluate(() => (window as unknown as { __board?: { tokens: TokenSpot[] } }).__board?.tokens);

const atStart = (...seats: string[]) => seats.map((seat) => ({ seat, cell: 0 }));

const seat = (page: Page, name: "creator" | "joiner") => page.locator(`[data-seat="${name}"]`);

async function createMatch(page: Page, name: string): Promise<string> {
  await page.goto("/");
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "New Match" }).click();
  await expect(page).toHaveURL(/\/m\/[2-9A-HJKMNP-Z]{5}$/);
  return new URL(page.url()).pathname.slice(3);
}

async function joinByLink(page: Page, code: string, name: string): Promise<void> {
  await page.goto(`/m/${code}`);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Join" }).click();
}

async function expectBothConnected(page: Page, alex = "Alex", sam = "Sam") {
  await expect(seat(page, "creator")).toContainText(alex, { timeout: 2_000 });
  await expect(seat(page, "creator")).toContainText("connected", { timeout: 2_000 });
  await expect(seat(page, "joiner")).toContainText(sam, { timeout: 2_000 });
  await expect(seat(page, "joiner").getByText("connected", { exact: true })).toBeVisible({
    timeout: 2_000,
  });
}

test("two Players meet, leave and come back", async ({ browser }) => {
  const [alexContext, alex] = await newPlayer(browser);
  const [samContext, sam] = await newPlayer(browser);

  // Alex creates a Match and waits.
  const code = await createMatch(alex, "Alex");
  await expect(seat(alex, "creator")).toContainText("Alex (you)");
  await expect(seat(alex, "joiner")).toContainText("Waiting for a friend…");
  await expect.poll(() => tokens(alex)).toEqual(atStart("creator"));
  await alex.getByRole("button", { name: "Copy link" }).click();
  const link = await alex.evaluate(() => navigator.clipboard.readText());
  expect(link).toBe(new URL(`/m/${code}`, alex.url()).href);
  await alex.screenshot({ path: "visual-output/match-waiting.png" });

  // Sam joins by link; both see both, within 2 seconds.
  await joinByLink(sam, code, "Sam");
  await expectBothConnected(sam);
  await expectBothConnected(alex);
  await expect.poll(() => tokens(alex)).toEqual(atStart("creator", "joiner"));
  await expect.poll(() => tokens(sam)).toEqual(atStart("creator", "joiner"));
  await expect(seat(sam, "joiner")).toContainText("Sam (you)");
  await alex.screenshot({ path: "visual-output/match-creator.png" });
  await sam.screenshot({ path: "visual-output/match-joiner.png" });

  // Sam refreshes: same seat, no name prompt.
  await sam.reload();
  await expect(seat(sam, "joiner")).toContainText("Sam (you)");
  await expect(sam.getByLabel("Your name")).toHaveCount(0);

  // Sam closes the tab: Alex sees it within 5 seconds, and Sam keeps the seat.
  await sam.close();
  await expect(seat(alex, "joiner")).toContainText("disconnected", { timeout: 5_000 });
  await expect(seat(alex, "joiner")).toContainText("Sam");

  // Sam reopens the link: back in the Scarecrow seat.
  const samAgain = await samContext.newPage();
  await samAgain.goto(`/m/${code}`);
  await expect(seat(samAgain, "joiner")).toContainText("Sam (you)");
  await expectBothConnected(alex);

  await alexContext.close();
  await samContext.close();
});

test("the newest tab holds the seat", async ({ browser }) => {
  const [context, firstTab] = await newPlayer(browser);
  const code = await createMatch(firstTab, "Alex");
  await expect(seat(firstTab, "creator")).toContainText("Alex (you)");

  const secondTab = await context.newPage();
  await secondTab.goto(`/m/${code}`);
  await expect(seat(secondTab, "creator")).toContainText("Alex (you)");
  await expect(firstTab.getByRole("alert")).toHaveText("This match is open in another tab");
  await firstTab.screenshot({ path: "visual-output/match-other-tab.png" });
  await context.close();
});

test("a third person sees the Match is full", async ({ browser }) => {
  const [alexContext, alex] = await newPlayer(browser);
  const [samContext, sam] = await newPlayer(browser);
  const [kimContext, kim] = await newPlayer(browser);
  const code = await createMatch(alex, "Alex");
  await joinByLink(sam, code, "Sam");
  await expectBothConnected(sam);

  await joinByLink(kim, code, "Kim");
  await expect(kim.getByRole("alert")).toHaveText("This match is full");
  await expect.poll(() => tokens(kim)).toEqual([]);
  await kim.screenshot({ path: "visual-output/match-full.png" });
  await kim.getByRole("button", { name: "Back to home" }).click();
  await expect(kim).toHaveURL(/\/$/);
  await expect(kim.getByRole("button", { name: "New Match" })).toBeVisible();

  await Promise.all([alexContext, samContext, kimContext].map((c) => c.close()));
});

test("a mistyped code shows Match not found", async ({ browser }) => {
  const [context, page] = await newPlayer(browser);
  await page.goto("/");
  await page.getByLabel("Your name").fill("Kim");
  await page.getByLabel("Match Code").fill("zzzz9");
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page).toHaveURL(/\/m\/ZZZZ9$/);
  await expect(page.getByRole("alert")).toHaveText("Match not found");
  await page.screenshot({ path: "visual-output/match-not-found.png" });
  await page.getByRole("button", { name: "Back to home" }).click();
  await expect(page.getByRole("button", { name: "New Match" })).toBeVisible();
  await context.close();
});

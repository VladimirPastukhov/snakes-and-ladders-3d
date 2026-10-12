import { expect, test, type Browser, type Page } from "@playwright/test";

// How a Turn is shown: die tumble, hops, Jump flight and the follow camera (`turn-animation` spec).
// The die is random, so each test plays whatever Turns come and checks what holds for any Roll.

const PHONE = { width: 390, height: 844 };

type BoardDebug = {
  animating: boolean;
  following: boolean;
  die: { value: number; resting: boolean } | null;
  tokens: { seat: string; cell: number }[];
  camera: { distance: number; overviewDistance: number };
  cells: { cell: number; onScreen: boolean }[];
};

const board = (page: Page) =>
  page.evaluate(() => (window as unknown as { __board: BoardDebug }).__board);
const rollButton = (page: Page) => page.getByRole("button", { name: "Roll" });
const lastTurn = (page: Page) => page.getByTestId("last-turn");
/** How far the camera is from the whole-Board view (1 = there). The view re-fits when the panel grows. */
const zoom = async (page: Page) => {
  const { camera } = await board(page);
  return camera.distance / camera.overviewDistance;
};

interface Player {
  page: Page;
  name: string;
  seat: "creator" | "joiner";
}

async function startMatch(browser: Browser, options: { reducedMotion?: "reduce" } = {}) {
  const contexts = await Promise.all(
    [0, 1].map(() => browser.newContext({ viewport: PHONE, ...options })),
  );
  const [alex, sam] = await Promise.all(contexts.map((c) => c.newPage()));
  await alex!.goto("/");
  await alex!.getByLabel("Your name").fill("Alex");
  await alex!.getByRole("button", { name: "New Match" }).click();
  await expect(alex!).toHaveURL(/\/m\/\w{5}$/);
  await sam!.goto(alex!.url());
  await sam!.getByLabel("Your name").fill("Sam");
  await sam!.getByRole("button", { name: "Join" }).click();
  await expect(alex!.getByTestId("turn")).toBeVisible();
  await expect(sam!.getByTestId("turn")).toBeVisible();
  await expect(alex!.locator('[data-board-ready="true"]')).toBeVisible();
  await expect(sam!.locator('[data-board-ready="true"]')).toBeVisible();
  const players: Player[] = [
    { page: alex!, name: "Alex", seat: "creator" },
    { page: sam!, name: "Sam", seat: "joiner" },
  ];
  const close = () => Promise.all(contexts.map((c) => c.close()));
  return { players, close };
}

/** The Current Player and the other Player, as the screens show it now. */
async function whoseTurn(players: Player[]): Promise<[Player, Player]> {
  const alexTurn = (await players[0]!.page.getByTestId("turn").textContent())?.includes(
    "Your Turn",
  );
  return alexTurn ? [players[0]!, players[1]!] : [players[1]!, players[0]!];
}

/** "Alex rolled 3: Start → 3 → Ladder → 11" → roll 3, ends on 11. */
function parseTurn(text: string) {
  const roll = Number(/rolled (\d)/.exec(text)![1]);
  const end = text.split(" → ").at(-1)!;
  return { roll, to: end === "Start" ? 0 : Number(end) };
}

test("a Roll tumbles the die, hops the Token and follows it, then reveals the result", async ({
  browser,
}) => {
  const { players, close } = await startMatch(browser);
  const [roller, waiter] = await whoseTurn(players);

  const rolledAt = Date.now();
  await rollButton(roller.page).click();

  // Both screens animate and follow; the panel still shows the Turn from before the Roll.
  for (const { page } of players) {
    await expect.poll(async () => (await board(page)).animating, { timeout: 1_000 }).toBe(true);
  }
  await waiter.page.screenshot({ path: "visual-output/animation-tumble.png" });
  expect((await board(waiter.page)).following).toBe(true);
  await expect(waiter.page.getByTestId("turn")).toHaveText(`${roller.name}'s Turn`);
  await expect(lastTurn(waiter.page)).toHaveCount(0);
  await expect(rollButton(waiter.page)).toHaveCount(0);

  // Mid-Move: the camera has come closer than the overview.
  await expect.poll(() => zoom(waiter.page)).toBeLessThan(0.9);
  await waiter.page.screenshot({ path: "visual-output/animation-follow.png" });

  // Settled within 6 seconds of the Roll, on both screens.
  for (const { page } of players) {
    await expect(lastTurn(page)).toHaveText(new RegExp(`^${roller.name} rolled [1-6]: `), {
      timeout: 6_000,
    });
  }
  expect(Date.now() - rolledAt).toBeLessThan(6_000);
  await expect(waiter.page.getByTestId("turn")).toHaveText("Your Turn");
  await expect(rollButton(waiter.page)).toBeEnabled();

  // The die shows the Roll, the Token stands where the text says, and the camera is back.
  const { roll, to } = parseTurn((await lastTurn(waiter.page).textContent())!);
  for (const { page } of players) {
    const after = await board(page);
    expect(after.animating).toBe(false);
    expect(after.die).toMatchObject({ value: roll, resting: true });
    expect(after.tokens.find((t) => t.seat === roller.seat)?.cell).toBe(to);
  }
  await expect.poll(() => zoom(waiter.page)).toBeCloseTo(1, 2);
  const { cells, following } = await board(waiter.page);
  expect(following).toBe(false);
  expect(cells.filter((c) => !c.onScreen).map((c) => c.cell)).toEqual([]);
  await waiter.page.screenshot({ path: "visual-output/animation-settled.png" });

  await close();
});

test("dragging the Board during a Turn stops the camera following on that screen only", async ({
  browser,
}) => {
  const { players, close } = await startMatch(browser);
  // Play one Turn first: the panel grows when the first last-Turn line appears, and the Board
  // re-frames to the new canvas size, as on any resize.
  const [first, second] = await whoseTurn(players);
  await rollButton(first.page).click();
  await expect(second.page.getByTestId("turn")).toHaveText("Your Turn", { timeout: 6_000 });
  await expect.poll(() => zoom(first.page)).toBeCloseTo(1, 2);
  const [roller, waiter] = [second, first];
  const canvasHeight = async () =>
    (await waiter.page.locator(".board canvas").boundingBox())!.height;
  const heightBefore = await canvasHeight();

  await rollButton(roller.page).click();
  await expect.poll(async () => (await board(waiter.page)).following).toBe(true);
  const box = (await waiter.page.locator(".board canvas").boundingBox())!;
  await waiter.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await waiter.page.mouse.down();
  await waiter.page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 5 });
  await waiter.page.mouse.up();

  expect((await board(waiter.page)).following).toBe(false);
  expect((await board(roller.page)).following).toBe(true);
  await expect(lastTurn(waiter.page)).toBeVisible({ timeout: 6_000 });
  // The camera stays where the Player left it instead of gliding back to the overview.
  await waiter.page.waitForTimeout(1_000);
  // The Roll button appearing does not resize the Board, so nothing re-frames the camera.
  expect(await canvasHeight()).toBe(heightBefore);
  expect(await zoom(waiter.page)).toBeLessThan(0.95);
  await expect.poll(() => zoom(roller.page)).toBeCloseTo(1, 2);

  await close();
});

test("reopening a Match shows the Tokens where they are, with no replay", async ({ browser }) => {
  const { players, close } = await startMatch(browser);
  const [roller, waiter] = await whoseTurn(players);
  await rollButton(roller.page).click();
  await expect(lastTurn(waiter.page)).toBeVisible({ timeout: 6_000 });
  const { to } = parseTurn((await lastTurn(waiter.page).textContent())!);

  await waiter.page.reload();
  await expect(lastTurn(waiter.page)).toBeVisible();
  await expect(waiter.page.locator('[data-board-ready="true"]')).toBeVisible();
  for (let sample = 0; sample < 10; sample++) {
    const now = await board(waiter.page);
    expect(now.animating).toBe(false);
    expect(now.following).toBe(false);
    expect(now.tokens.find((t) => t.seat === roller.seat)?.cell).toBe(to);
    await waiter.page.waitForTimeout(100);
  }

  await close();
});

test("with reduced motion, a Turn is shown at once without animation", async ({ browser }) => {
  const { players, close } = await startMatch(browser, { reducedMotion: "reduce" });
  const [roller, waiter] = await whoseTurn(players);

  await rollButton(roller.page).click();
  await expect(lastTurn(waiter.page)).toBeVisible({ timeout: 1_500 });
  const { roll, to } = parseTurn((await lastTurn(waiter.page).textContent())!);
  // The Board draws the new state on its next frame.
  await expect.poll(async () => (await board(waiter.page)).die?.value).toBe(roll);
  const now = await board(waiter.page);
  expect(now).toMatchObject({ animating: false, following: false });
  expect(now.die?.resting).toBe(true);
  expect(now.tokens.find((t) => t.seat === roller.seat)?.cell).toBe(to);
  expect(await zoom(waiter.page)).toBeCloseTo(1, 3);
  await expect(waiter.page.getByTestId("turn")).toHaveText("Your Turn");

  await close();
});

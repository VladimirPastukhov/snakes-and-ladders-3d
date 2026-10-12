import { expect, test, type Page } from "@playwright/test";

// Two Players (separate browser contexts) play a whole Match. The die is random, so the test
// presses Roll on whichever page shows it until someone wins.

const PHONE = { width: 390, height: 844 };
const MAX_PRESSES = 300;

type TokenSpot = { seat: string; cell: number };
type BoardDebug = { tokens: TokenSpot[]; cells: { cell: number; onScreen: boolean }[] };

const board = (page: Page) =>
  page.evaluate(() => (window as unknown as { __board: BoardDebug }).__board);
const lastTurn = (page: Page) => page.getByTestId("last-turn");
const rollButton = (page: Page) => page.getByRole("button", { name: "Roll" });

test("two Players play a whole Match to a Winner", async ({ browser }) => {
  test.setTimeout(240_000);
  const alexContext = await browser.newContext({ viewport: PHONE });
  const samContext = await browser.newContext({ viewport: PHONE });
  const alex = await alexContext.newPage();
  const sam = await samContext.newPage();
  const players = [
    { page: alex, name: "Alex", seat: "creator" },
    { page: sam, name: "Sam", seat: "joiner" },
  ];

  await alex.goto("/");
  await alex.getByLabel("Your name").fill("Alex");
  await alex.getByRole("button", { name: "New Match" }).click();
  await expect(alex).toHaveURL(/\/m\/\w{5}$/);
  await sam.goto(alex.url());
  await sam.getByLabel("Your name").fill("Sam");
  await sam.getByRole("button", { name: "Join" }).click();

  // Exactly one screen says "Your Turn" and shows Roll; the other names that Player.
  await expect(alex.getByTestId("turn")).toBeVisible();
  await expect(sam.getByTestId("turn")).toBeVisible();

  let previous = "";
  let presses = 0;
  for (; presses < MAX_PRESSES; presses++) {
    if (await alex.getByText(/You win!|wins$/).isVisible()) break;
    const alexTurn = (await alex.getByTestId("turn").textContent())?.includes("Your Turn");
    const current = alexTurn ? players[0]! : players[1]!;
    const other = alexTurn ? players[1]! : players[0]!;
    await expect(other.page.getByTestId("turn")).toHaveText(`${current.name}'s Turn`);
    await expect(rollButton(other.page)).toHaveCount(0);

    await rollButton(current.page).click();

    // Both screens show the same, new last Turn, by the Player who rolled.
    await expect(lastTurn(current.page)).toHaveText(new RegExp(`^${current.name} rolled [1-6]: `));
    const text = (await lastTurn(current.page).textContent())!;
    expect(text).not.toBe(previous);
    await expect(lastTurn(other.page)).toHaveText(text);
    previous = text;

    // The roller's Token stands where the text says it ended, on both Boards.
    const to = Number(text.split(" → ").at(-1));
    for (const { page } of players) {
      await expect
        .poll(async () => (await board(page)).tokens.find((t) => t.seat === current.seat)?.cell)
        .toBe(to);
    }
    expect((await board(alex)).tokens).toEqual((await board(sam)).tokens);

    if (presses === 5) {
      const { cells } = await board(alex);
      expect(cells.filter((c) => !c.onScreen).map((c) => c.cell)).toEqual([]);
      await alex.screenshot({ path: "visual-output/play-midgame-alex.png" });
      await sam.screenshot({ path: "visual-output/play-midgame-sam.png" });
    }
  }
  expect(presses).toBeLessThan(MAX_PRESSES);

  // One screen says "You win!", the other names the Winner; nobody can Roll.
  const winnerText = await Promise.all(
    players.map(({ page }) => page.getByRole("status").textContent()),
  );
  const winnerIndex = winnerText.findIndex((t) => t?.includes("You win!"));
  expect(winnerIndex).toBeGreaterThanOrEqual(0);
  const winner = players[winnerIndex]!;
  const loser = players[1 - winnerIndex]!;
  await expect(loser.page.getByRole("status")).toHaveText(`${winner.name} wins`);
  for (const { page } of players) await expect(rollButton(page)).toHaveCount(0);
  expect((await board(alex)).tokens.find((t) => t.seat === winner.seat)?.cell).toBe(30);
  console.log(`${winner.name} won after ${presses} Rolls`);

  await winner.page.screenshot({ path: "visual-output/play-winner.png" });
  await loser.page.screenshot({ path: "visual-output/play-loser.png" });

  // Coming back to a Finished Match shows the result.
  await loser.page.reload();
  await expect(loser.page.getByRole("status")).toHaveText(`${winner.name} wins`);

  await alexContext.close();
  await samContext.close();
});

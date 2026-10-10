import { expect, test, type Page } from "@playwright/test";

// Mirrors the shape of `window.__board` (client/src/board/debug.tsx); only the fields used here.
interface BoardDebug {
  cells: { cell: number; onScreen: boolean }[];
  arcs: { from: number; x: number; y: number }[];
  selectedEventName: string | null;
}

const VIEWPORTS = [
  { name: "phone-portrait", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

async function openBoard(page: Page) {
  await page.goto("/");
  await expect(page.locator('[data-board-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => Boolean(window.__board))).toBe(true);
}

const board = (page: Page) =>
  page.evaluate(() => (window as unknown as { __board: BoardDebug }).__board);

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("shows all 30 Cells", async ({ page }) => {
      await openBoard(page);
      const { cells } = await board(page);
      expect(cells).toHaveLength(30);
      expect(cells.filter((c) => !c.onScreen).map((c) => c.cell)).toEqual([]);
      await page.screenshot({ path: `visual-output/${viewport.name}.png` });
    });

    test("names the Deadly Poppies on hover", async ({ page }) => {
      await openBoard(page);
      const poppies = (await board(page)).arcs.find((arc) => arc.from === 27)!;
      await page.mouse.move(poppies.x, poppies.y);
      await expect(page.locator(".event-label", { hasText: "Deadly Poppies" })).toBeVisible();
      await expect.poll(async () => (await board(page)).selectedEventName).toBe("Deadly Poppies");
      await page.screenshot({ path: `visual-output/${viewport.name}-poppies.png` });
    });
  });
}

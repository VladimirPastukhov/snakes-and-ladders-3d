import { describe, expect, it } from "vitest";
import { GAME_TITLE } from "./index";

describe("GAME_TITLE", () => {
  it("names the game", () => {
    expect(GAME_TITLE).toContain("Snakes & Ladders");
  });
});

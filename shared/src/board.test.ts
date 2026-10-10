import { describe, expect, it } from "vitest";
import { CELL_COUNT, FINAL_CELL, JUMPS, START, resolveJump } from "./board";

describe("Board", () => {
  it("has Cells 1 to 30 between Start (0) and the Final Cell (30)", () => {
    expect(START).toBe(0);
    expect(CELL_COUNT).toBe(30);
    expect(FINAL_CELL).toBe(30);
  });

  it("has exactly the three Ladders and three Snakes", () => {
    expect(JUMPS).toEqual([
      { kind: "ladder", from: 3, to: 11 },
      { kind: "ladder", from: 16, to: 23 },
      { kind: "ladder", from: 24, to: 29 },
      { kind: "snake", from: 18, to: 8 },
      { kind: "snake", from: 22, to: 13 },
      { kind: "snake", from: 27, to: 19 },
    ]);
  });

  it("sends a Token on a Ladder's bottom Cell up", () => {
    expect(resolveJump(16)).toBe(23);
  });

  it("sends a Token on a Snake's head Cell down", () => {
    expect(resolveJump(27)).toBe(19);
  });

  it("leaves a Token on an ordinary Cell where it is", () => {
    expect(resolveJump(5)).toBe(5);
  });

  it("never chains: a resolved Cell is not the start of another Jump", () => {
    for (let cell = 1; cell <= CELL_COUNT; cell++) {
      const landed = resolveJump(cell);
      expect(resolveJump(landed)).toBe(landed);
    }
  });

  it("never touches Start or the Final Cell, and each Cell starts at most one Jump", () => {
    const starts = JUMPS.map((jump) => jump.from);
    expect(new Set(starts).size).toBe(starts.length);
    for (const { from, to } of JUMPS) {
      for (const cell of [from, to]) {
        expect(cell).toBeGreaterThan(START);
        expect(cell).toBeLessThan(FINAL_CELL);
      }
    }
  });

  it("sends Ladders up and Snakes down", () => {
    for (const { kind, from, to } of JUMPS) {
      if (kind === "ladder") expect(to).toBeGreaterThan(from);
      else expect(to).toBeLessThan(from);
    }
  });
});

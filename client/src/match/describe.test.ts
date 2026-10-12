import type { MatchSnapshot, Turn } from "@sl/shared";
import { describe, expect, it } from "vitest";
import { describeTurn } from "./describe";

const match = {
  seats: { creator: { name: "Alex", connected: true }, joiner: { name: "Sam", connected: true } },
} as MatchSnapshot;

const turn = (t: Partial<Turn>): Turn => ({
  seat: "creator",
  roll: 1,
  from: 0,
  landed: 1,
  to: 1,
  jump: null,
  ...t,
});

describe("describeTurn", () => {
  it.each([
    [
      turn({ roll: 3, from: 0, landed: 3, to: 11, jump: "ladder" }),
      "Alex rolled 3: Start → 3 → Ladder → 11",
    ],
    [
      turn({ seat: "joiner", roll: 6, from: 21, landed: 27, to: 19, jump: "snake" }),
      "Sam rolled 6: 21 → 27 → Snake → 19",
    ],
    [turn({ seat: "joiner", roll: 2, from: 5, landed: 7, to: 7 }), "Sam rolled 2: 5 → 7"],
    [turn({ roll: 5, from: 28, landed: 30, to: 30 }), "Alex rolled 5: 28 → 30"],
  ])("%#", (t, text) => {
    expect(describeTurn(t, match)).toBe(text);
  });
});

import { describe, expect, it } from "vitest";
import type { Seat } from "./match";
import { WAITING_GAME, startGame, takeTurn, type GameState } from "./rules";

function game(
  positions: { creator: number; joiner: number },
  current: Seat = "creator",
): GameState {
  return { ...startGame(current), positions };
}

describe("startGame", () => {
  it("puts both Tokens at Start with the chosen Current Player", () => {
    expect(startGame("joiner")).toEqual({
      phase: "in_progress",
      positions: { creator: 0, joiner: 0 },
      currentPlayer: "joiner",
      winner: null,
      lastTurn: null,
    });
  });
});

describe("takeTurn", () => {
  it.each([
    ["plain Move", 5, 3, { landed: 8, to: 8, jump: null }],
    ["Ladder from Start", 0, 3, { landed: 3, to: 11, jump: "ladder" }],
    ["Ladder 16 → 23", 12, 4, { landed: 16, to: 23, jump: "ladder" }],
    ["Snake 27 → 19", 21, 6, { landed: 27, to: 19, jump: "snake" }],
    ["Snake 22 → 13", 20, 2, { landed: 22, to: 13, jump: "snake" }],
  ] as const)("%s", (_, from, roll, expected) => {
    const result = takeTurn(game({ creator: from, joiner: 0 }), "creator", roll)!;
    expect(result.turn).toEqual({ seat: "creator", roll, from, ...expected });
    expect(result.state.positions).toEqual({ creator: expected.to, joiner: 0 });
    expect(result.state.currentPlayer).toBe("joiner");
    expect(result.state.lastTurn).toEqual(result.turn);
    expect(result.state.phase).toBe("in_progress");
  });

  it("lets Tokens share a Cell without moving either back", () => {
    const result = takeTurn(game({ creator: 8, joiner: 5 }, "joiner"), "joiner", 3)!;
    expect(result.state.positions).toEqual({ creator: 8, joiner: 8 });
    expect(result.state.currentPlayer).toBe("creator");
  });

  it("gives no extra Turn for a six", () => {
    const result = takeTurn(game({ creator: 0, joiner: 0 }), "creator", 6)!;
    expect(result.state.currentPlayer).toBe("joiner");
  });

  it("wins on landing exactly on the Final Cell", () => {
    const result = takeTurn(game({ creator: 26, joiner: 4 }), "creator", 4)!;
    expect(result.state).toMatchObject({
      phase: "finished",
      positions: { creator: 30, joiner: 4 },
      winner: "creator",
      currentPlayer: null,
    });
  });

  it("wins on passing the Final Cell, standing on it", () => {
    const result = takeTurn(game({ creator: 2, joiner: 28 }, "joiner"), "joiner", 5)!;
    expect(result.turn).toMatchObject({ from: 28, landed: 30, to: 30, jump: null });
    expect(result.state).toMatchObject({ phase: "finished", winner: "joiner" });
    expect(result.state.positions.joiner).toBe(30);
  });

  it.each<[string, GameState, Seat]>([
    ["out of turn", game({ creator: 5, joiner: 5 }), "joiner"],
    ["while Waiting", WAITING_GAME, "creator"],
    [
      "after the Match is Finished",
      {
        ...game({ creator: 30, joiner: 4 }),
        phase: "finished",
        currentPlayer: null,
        winner: "creator",
      },
      "joiner",
    ],
  ])("refuses a Roll %s", (_, state, seat) => {
    expect(takeTurn(state, seat, 3)).toBeNull();
  });

  it("refuses a second Roll by the same Player", () => {
    const first = takeTurn(game({ creator: 0, joiner: 0 }), "creator", 2)!;
    expect(takeTurn(first.state, "creator", 2)).toBeNull();
  });

  it("does not change the state it was given", () => {
    const state = game({ creator: 5, joiner: 0 });
    const copy = JSON.parse(JSON.stringify(state)) as GameState;
    takeTurn(state, "creator", 3);
    expect(state).toEqual(copy);
  });

  it.each([0, 7, 2.5])("rejects an impossible Roll of %s", (roll) => {
    expect(() => takeTurn(game({ creator: 0, joiner: 0 }), "creator", roll)).toThrow(RangeError);
  });
});

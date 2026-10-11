import type { MatchSnapshot } from "@sl/shared";
import { describe, expect, it } from "vitest";
import { initialMatchState, isReconnecting, matchReducer, type MatchState } from "./state";

const waiting: MatchSnapshot = {
  code: "K7QXM",
  phase: "waiting",
  seats: { creator: { name: "Alex", connected: true } },
  positions: { creator: 0, joiner: 0 },
  currentPlayer: null,
  winner: null,
  lastTurn: null,
};
const both: MatchSnapshot = {
  ...waiting,
  phase: "in_progress",
  seats: { ...waiting.seats, joiner: { name: "Sam", connected: true } },
};

const seated: MatchState = { status: "seated", you: "creator", match: waiting };

describe("matchReducer", () => {
  it("starts out connecting", () => {
    expect(initialMatchState).toEqual({ status: "connecting" });
    expect(isReconnecting(initialMatchState)).toBe(false);
  });

  it("is seated after welcome", () => {
    const state = matchReducer(initialMatchState, {
      type: "message",
      message: { type: "welcome", you: "creator", match: waiting },
    });
    expect(state).toEqual(seated);
  });

  it("takes the new snapshot from an update", () => {
    const state = matchReducer(seated, {
      type: "message",
      message: { type: "update", event: "joined", match: both },
    });
    expect(state).toEqual({ status: "seated", you: "creator", match: both });
  });

  it.each(["full", "not_found"] as const)("shows %s when rejected", (reason) => {
    const state = matchReducer(initialMatchState, {
      type: "message",
      message: { type: "rejected", reason },
    });
    expect(state).toEqual({ status: reason });
  });

  it("keeps the last Match while reconnecting", () => {
    const state = matchReducer(seated, { type: "connection_lost" });
    expect(state).toEqual({ ...seated, status: "connecting" });
    expect(isReconnecting(state)).toBe(true);
  });

  it("stops at replaced and ignores later messages", () => {
    const state = matchReducer(seated, { type: "replaced" });
    expect(state).toEqual({ status: "replaced" });
    expect(
      matchReducer(state, {
        type: "message",
        message: { type: "welcome", you: "creator", match: waiting },
      }),
    ).toBe(state);
  });

  it("starts over on reset, even from a final state", () => {
    expect(matchReducer({ status: "replaced" }, { type: "reset" })).toEqual(initialMatchState);
  });
});

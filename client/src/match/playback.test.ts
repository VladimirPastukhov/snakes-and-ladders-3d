import type { MatchSnapshot, Turn } from "@sl/shared";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialPlayback, isBusy, playbackReducer, type Playback } from "./playback";
import type { MatchState } from "./state";
import { usePlayback } from "./usePlayback";

const before: MatchSnapshot = {
  code: "K7QXM",
  phase: "in_progress",
  seats: { creator: { name: "Alex", connected: true }, joiner: { name: "Sam", connected: true } },
  positions: { creator: 0, joiner: 0 },
  currentPlayer: "creator",
  winner: null,
  lastTurn: null,
};

const alexTurn: Turn = { seat: "creator", roll: 3, from: 0, landed: 3, to: 11, jump: "ladder" };
const afterAlex: MatchSnapshot = {
  ...before,
  positions: { creator: 11, joiner: 0 },
  currentPlayer: "joiner",
  lastTurn: alexTurn,
};
const samTurn: Turn = { seat: "joiner", roll: 2, from: 0, landed: 2, to: 2, jump: null };
const afterSam: MatchSnapshot = {
  ...afterAlex,
  positions: { creator: 11, joiner: 2 },
  currentPlayer: "creator",
  lastTurn: samTurn,
};
const samGone: MatchSnapshot = {
  ...afterAlex,
  seats: { ...afterAlex.seats, joiner: { name: "Sam", connected: false } },
};

const duration = () => 1000;
const snapshot = (
  state: Playback,
  match: MatchSnapshot,
  arrival: MatchState["arrival"],
  { instant = false, now = 0 } = {},
) => playbackReducer(state, { type: "snapshot", match, arrival, instant, duration, now });

const welcomed = snapshot(initialPlayback, before, "welcome");

describe("playbackReducer", () => {
  it("shows a welcome at once, with nothing to animate", () => {
    const state = snapshot(initialPlayback, afterAlex, "welcome");
    expect(state.shown).toBe(afterAlex);
    expect(isBusy(state)).toBe(false);
  });

  it("animates a rolled Turn and reveals it when the Turn finishes", () => {
    const playing = snapshot(welcomed, afterAlex, "rolled", { now: 50 });
    expect(playing.shown).toBe(before);
    expect(playing.playing).toMatchObject({ turn: alexTurn, startedAt: 50, duration: 1000 });

    const done = playbackReducer(playing, { type: "finish", now: 1050 });
    expect(done.shown).toEqual(afterAlex);
    expect(isBusy(done)).toBe(false);
  });

  it("plays two quick Turns in order", () => {
    let state = snapshot(welcomed, afterAlex, "rolled");
    state = snapshot(state, afterSam, "rolled", { now: 500 });
    expect(state.playing?.turn).toBe(alexTurn);
    expect(state.queue.map((t) => t.turn)).toEqual([samTurn]);

    state = playbackReducer(state, { type: "finish", now: 1000 });
    expect(state.shown).toEqual(afterAlex);
    expect(state.playing).toMatchObject({ turn: samTurn, startedAt: 1000 });

    state = playbackReducer(state, { type: "finish", now: 2000 });
    expect(state.shown).toEqual(afterSam);
    expect(isBusy(state)).toBe(false);
  });

  it("shows presence and renames at once, even while a Turn plays", () => {
    let state = snapshot(welcomed, afterAlex, "rolled");
    state = snapshot(state, samGone, "disconnected");
    expect(state.shown?.seats.joiner?.connected).toBe(false);
    expect(state.shown?.positions).toEqual(before.positions);
    expect(state.playing?.turn).toBe(alexTurn);

    state = playbackReducer(state, { type: "finish", now: 1000 });
    expect(state.shown?.positions).toEqual(afterAlex.positions);
    expect(state.shown?.seats.joiner?.connected).toBe(false);
  });

  it("applies other updates whole when nothing plays", () => {
    const state = snapshot(welcomed, samGone, "disconnected");
    expect(state.shown).toBe(samGone);
  });

  it("clears the queue on a reconnect", () => {
    let state = snapshot(welcomed, afterAlex, "rolled");
    state = snapshot(state, afterSam, "rolled");
    state = snapshot(state, afterSam, "welcome");
    expect(state.shown).toBe(afterSam);
    expect(isBusy(state)).toBe(false);
  });

  it("applies a Turn at once when it must not animate", () => {
    const state = snapshot(welcomed, afterAlex, "rolled", { instant: true });
    expect(state.shown).toBe(afterAlex);
    expect(isBusy(state)).toBe(false);
  });

  it("flushes everything queued", () => {
    let state = snapshot(welcomed, afterAlex, "rolled");
    state = snapshot(state, afterSam, "rolled");
    state = playbackReducer(state, { type: "flush" });
    expect(state.shown).toBe(afterSam);
    expect(isBusy(state)).toBe(false);
  });

  it("forgets the Match when it goes away", () => {
    const state = playbackReducer(welcomed, {
      type: "snapshot",
      match: undefined,
      arrival: undefined,
      instant: false,
      duration,
      now: 0,
    });
    expect(state).toEqual(initialPlayback);
  });
});

describe("usePlayback", () => {
  let reduced = false;
  let hidden = false;

  beforeEach(() => {
    vi.useFakeTimers();
    reduced = false;
    hidden = false;
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduced, media: query }));
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() =>
      hidden ? "hidden" : "visible",
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const seated = (match: MatchSnapshot, arrival: MatchState["arrival"]): MatchState => ({
    status: "seated",
    you: "joiner",
    match,
    arrival,
  });

  function render() {
    return renderHook((props: MatchState) => usePlayback(props), {
      initialProps: seated(before, "welcome"),
    });
  }

  it("reveals a Turn after its animation's duration", () => {
    const hook = render();
    hook.rerender(seated(afterAlex, "rolled"));
    expect(hook.result.current.busy).toBe(true);
    expect(hook.result.current.shown).toBe(before);

    // Start → 3 is three hops, then the Ladder: well under 5 s, more than 1 s.
    act(() => vi.advanceTimersByTime(1000));
    expect(hook.result.current.shown).toBe(before);
    act(() => vi.advanceTimersByTime(4000));
    expect(hook.result.current.shown).toEqual(afterAlex);
    expect(hook.result.current.busy).toBe(false);
  });

  it("does not animate with reduced motion", () => {
    reduced = true;
    const hook = render();
    hook.rerender(seated(afterAlex, "rolled"));
    expect(hook.result.current.shown).toBe(afterAlex);
    expect(hook.result.current.busy).toBe(false);
  });

  it("does not animate in a hidden tab, and finishes at once when the tab is hidden", () => {
    const hook = render();
    hook.rerender(seated(afterAlex, "rolled"));
    expect(hook.result.current.busy).toBe(true);

    hidden = true;
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(hook.result.current.shown).toEqual(afterAlex);

    hook.rerender(seated(afterSam, "rolled"));
    expect(hook.result.current.shown).toBe(afterSam);
    expect(hook.result.current.busy).toBe(false);
  });
});

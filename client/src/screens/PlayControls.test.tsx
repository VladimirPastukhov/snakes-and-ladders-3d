import type { MatchSnapshot, Seat, Turn } from "@sl/shared";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { turnDuration } from "../board/turnMotion";
import type { MatchState } from "../match/state";
import { usePlayback } from "../match/usePlayback";
import { PlayControls, ROLL_RETRY_MS } from "./PlayControls";

const base: MatchSnapshot = {
  code: "K7QXM",
  phase: "in_progress",
  seats: {
    creator: { name: "Alex", connected: true },
    joiner: { name: "Sam", connected: true },
  },
  positions: { creator: 0, joiner: 0 },
  currentPlayer: "creator",
  winner: null,
  lastTurn: null,
};

function setup(match: MatchSnapshot, you: "creator" | "joiner" = "creator") {
  const onRoll = vi.fn();
  const onHome = vi.fn();
  const view = render(<PlayControls match={match} you={you} onRoll={onRoll} onHome={onHome} />);
  const rerender = (next: MatchSnapshot) =>
    view.rerender(<PlayControls match={next} you={you} onRoll={onRoll} onHome={onHome} />);
  return { onRoll, onHome, rerender };
}

const rollButton = () => screen.queryByRole("button", { name: "Roll" });
const press = (key: string, target: Element = document.body) => fireEvent.keyDown(target, { key });

afterEach(() => vi.useRealTimers());

describe("the Current Player", () => {
  it("sees Your Turn and a Roll button", () => {
    const { onRoll } = setup(base);
    expect(screen.getByTestId("turn")).toHaveTextContent("Your Turn");
    fireEvent.click(rollButton()!);
    expect(onRoll).toHaveBeenCalledOnce();
  });

  it("cannot press Roll again until the answer arrives", () => {
    const { onRoll, rerender } = setup(base);
    fireEvent.click(rollButton()!);
    expect(rollButton()).toBeDisabled();
    fireEvent.click(rollButton()!);
    press(" ");
    expect(onRoll).toHaveBeenCalledOnce();
    // The server answered, and (in a real game) it is still this Player's Turn after a refused Roll.
    rerender({ ...base });
    expect(rollButton()).toBeEnabled();
  });

  it("can press Roll again after 3 seconds without an answer", () => {
    vi.useFakeTimers();
    setup(base);
    fireEvent.click(rollButton()!);
    expect(rollButton()).toBeDisabled();
    act(() => vi.advanceTimersByTime(ROLL_RETRY_MS));
    expect(rollButton()).toBeEnabled();
  });

  it.each([" ", "Enter"])("rolls with %j", (key) => {
    const { onRoll } = setup(base);
    press(key);
    expect(onRoll).toHaveBeenCalledOnce();
  });

  it("does not roll from keys typed into a field or pressed on a button", () => {
    const { onRoll } = setup(base);
    const input = document.body.appendChild(document.createElement("input"));
    press(" ", input);
    press("Enter", rollButton()!);
    press("a");
    expect(onRoll).not.toHaveBeenCalled();
    input.remove();
  });
});

describe("the other Player", () => {
  it("sees whose Turn it is and no Roll button; keys do nothing", () => {
    const { onRoll } = setup(base, "joiner");
    expect(screen.getByTestId("turn")).toHaveTextContent("Alex's Turn");
    expect(rollButton()).not.toBeInTheDocument();
    press(" ");
    press("Enter");
    expect(onRoll).not.toHaveBeenCalled();
  });
});

describe("the last Turn", () => {
  it("is shown to both Players", () => {
    const match: MatchSnapshot = {
      ...base,
      currentPlayer: "joiner",
      positions: { creator: 11, joiner: 0 },
      lastTurn: { seat: "creator", roll: 3, from: 0, landed: 3, to: 11, jump: "ladder" },
    };
    for (const you of ["creator", "joiner"] as const) {
      const view = render(
        <PlayControls match={match} you={you} onRoll={vi.fn()} onHome={vi.fn()} />,
      );
      expect(view.getByTestId("last-turn")).toHaveTextContent(
        "Alex rolled 3: Start → 3 → Ladder → 11",
      );
      view.unmount();
    }
  });
});

describe("a Finished Match", () => {
  const finished: MatchSnapshot = {
    ...base,
    phase: "finished",
    currentPlayer: null,
    winner: "creator",
    positions: { creator: 30, joiner: 12 },
    lastTurn: { seat: "creator", roll: 4, from: 26, landed: 30, to: 30, jump: null },
  };

  it("tells the Winner they won, with no Roll button and a way home", () => {
    const { onHome, onRoll } = setup(finished, "creator");
    expect(screen.getByRole("status")).toHaveTextContent("You win!");
    expect(screen.getByTestId("last-turn")).toHaveTextContent("Alex rolled 4: 26 → 30");
    expect(rollButton()).not.toBeInTheDocument();
    press(" ");
    expect(onRoll).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Back to home" }));
    expect(onHome).toHaveBeenCalled();
  });

  it("tells the other Player who won", () => {
    setup(finished, "joiner");
    expect(screen.getByRole("status")).toHaveTextContent("Alex wins");
    expect(rollButton()).not.toBeInTheDocument();
  });
});

it("shows nothing while the Match is Waiting", () => {
  const { container } = render(
    <PlayControls
      match={{
        ...base,
        phase: "waiting",
        currentPlayer: null,
        seats: { creator: base.seats.creator },
      }}
      you="creator"
      onRoll={vi.fn()}
      onHome={vi.fn()}
    />,
  );
  expect(container).toBeEmptyDOMElement();
});

describe("while a Turn animates", () => {
  // Wired like App: the panel shows the playback's `shown` snapshot.
  function Harness({
    state,
    you,
    onRoll = () => {},
  }: {
    state: MatchState;
    you: Seat;
    onRoll?: () => void;
  }) {
    const { shown, busy } = usePlayback(state);
    if (!shown) return null;
    return (
      <PlayControls
        match={shown}
        latest={state.match}
        busy={busy}
        you={you}
        onRoll={onRoll}
        onHome={() => {}}
      />
    );
  }

  const seated = (match: MatchSnapshot, arrival: MatchState["arrival"]): MatchState => ({
    status: "seated",
    you: "creator",
    match,
    arrival,
  });
  const turn: Turn = { seat: "creator", roll: 4, from: 0, landed: 4, to: 4, jump: null };
  const afterRoll: MatchSnapshot = {
    ...base,
    positions: { creator: 4, joiner: 0 },
    currentPlayer: "joiner",
    lastTurn: turn,
  };
  // Alex's Turn just before: Alex is on 26, then rolls 4 to win.
  const nearEnd: MatchSnapshot = { ...base, positions: { creator: 26, joiner: 9 } };
  const winningTurn: Turn = { seat: "creator", roll: 4, from: 26, landed: 30, to: 30, jump: null };
  const won: MatchSnapshot = {
    ...nearEnd,
    phase: "finished",
    positions: { creator: 30, joiner: 9 },
    currentPlayer: null,
    winner: "creator",
    lastTurn: winningTurn,
  };

  let reduced = false;
  beforeEach(() => {
    vi.useFakeTimers();
    reduced = false;
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduced, media: query }));
  });
  afterEach(() => vi.unstubAllGlobals());

  function play(before: MatchSnapshot, after: MatchSnapshot, you: Seat) {
    const view = render(<Harness state={seated(before, "welcome")} you={you} />);
    view.rerender(<Harness state={seated(after, "rolled")} you={you} />);
    return view;
  }

  it("keeps the old Turn line and last Turn until the animation ends", () => {
    play(base, afterRoll, "joiner");
    expect(screen.getByTestId("turn")).toHaveTextContent("Alex's Turn");
    expect(screen.queryByTestId("last-turn")).toBeNull();
    expect(rollButton()).toBeNull();

    act(() => vi.advanceTimersByTime(turnDuration(turn)));
    expect(screen.getByTestId("turn")).toHaveTextContent("Your Turn");
    expect(screen.getByTestId("last-turn")).toHaveTextContent("Alex rolled 4: Start → 4");
    expect(rollButton()).toBeEnabled();
  });

  it("keeps the roller's Roll button disabled past the retry time while animating", () => {
    // The longest Turn: a 6 that ends on the Snake at 27.
    const snakeTurn: Turn = {
      seat: "creator",
      roll: 6,
      from: 21,
      landed: 27,
      to: 19,
      jump: "snake",
    };
    const before: MatchSnapshot = { ...base, positions: { creator: 21, joiner: 9 } };
    const after: MatchSnapshot = {
      ...before,
      positions: { creator: 19, joiner: 9 },
      currentPlayer: "joiner",
      lastTurn: snakeTurn,
    };
    expect(turnDuration(snakeTurn)).toBeGreaterThan(ROLL_RETRY_MS + 100);
    const onRoll = vi.fn();
    const view = render(
      <Harness state={seated(before, "welcome")} you="creator" onRoll={onRoll} />,
    );
    fireEvent.click(rollButton()!);
    view.rerender(<Harness state={seated(after, "rolled")} you="creator" onRoll={onRoll} />);
    expect(rollButton()).toBeDisabled();
    act(() => vi.advanceTimersByTime(ROLL_RETRY_MS + 100));
    expect(rollButton()).toBeDisabled();
    press(" ");
    expect(onRoll).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(turnDuration(snakeTurn)));
    expect(screen.getByTestId("turn")).toHaveTextContent("Sam's Turn");
  });

  it("announces the Winner only when the winning Move has been shown", () => {
    play(nearEnd, won, "joiner");
    expect(screen.queryByText("Alex wins")).toBeNull();
    act(() => vi.advanceTimersByTime(turnDuration(winningTurn) - 1));
    expect(screen.queryByText("Alex wins")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("Alex wins")).toBeInTheDocument();
  });

  it("reveals at once with reduced motion", () => {
    reduced = true;
    play(base, afterRoll, "joiner");
    expect(screen.getByTestId("turn")).toHaveTextContent("Your Turn");
    expect(screen.getByTestId("last-turn")).toHaveTextContent("Alex rolled 4");
  });
});

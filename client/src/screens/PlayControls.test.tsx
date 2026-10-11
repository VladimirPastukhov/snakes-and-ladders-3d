import type { MatchSnapshot } from "@sl/shared";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

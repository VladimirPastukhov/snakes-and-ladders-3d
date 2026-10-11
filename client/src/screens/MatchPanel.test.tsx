import type { MatchSnapshot } from "@sl/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { matchReducer, initialMatchState, isReconnecting } from "../match/state";
import { MatchPanel } from "./MatchPanel";

const waiting: MatchSnapshot = {
  code: "K7QXM",
  phase: "waiting",
  seats: { creator: { name: "Alex", connected: true } },
  positions: { creator: 0, joiner: 0 },
  currentPlayer: null,
  winner: null,
  lastTurn: null,
};

function seat(name: "creator" | "joiner") {
  return within(document.querySelector(`[data-seat="${name}"]`) as HTMLElement);
}

function renderFrom(match: MatchSnapshot, lost = false) {
  let state = matchReducer(initialMatchState, {
    type: "message",
    message: { type: "welcome", you: "creator", match },
  });
  if (lost) state = matchReducer(state, { type: "connection_lost" });
  render(
    <MatchPanel
      match={state.match!}
      you={state.you!}
      reconnecting={isReconnecting(state)}
      onRoll={vi.fn()}
      onHome={vi.fn()}
      origin="https://game.dev"
    />,
  );
}

describe("MatchPanel", () => {
  it("shows the invite link, the code, and the empty Scarecrow seat while Waiting", () => {
    renderFrom(waiting);
    expect(screen.getByLabelText("Invite link")).toHaveValue("https://game.dev/m/K7QXM");
    expect(screen.getByTestId("match-code")).toHaveTextContent("K7QXM");
    expect(seat("creator").getByText("Dorothy")).toBeInTheDocument();
    expect(seat("creator").getByText("Alex (you)")).toBeInTheDocument();
    expect(seat("creator").getByText("connected")).toBeInTheDocument();
    expect(seat("joiner").getByText("Scarecrow")).toBeInTheDocument();
    expect(seat("joiner").getByText("Waiting for a friend…")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("copies the full link", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderFrom(waiting);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith("https://game.dev/m/K7QXM");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument(),
    );
  });

  it("falls back to copying the selected link without the Clipboard API", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    const execCommand = vi.fn(() => true);
    document.execCommand = execCommand;
    renderFrom(waiting);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument(),
    );
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("shows both Players and who is disconnected", () => {
    renderFrom({
      ...waiting,
      phase: "in_progress",
      seats: { ...waiting.seats, joiner: { name: "Sam", connected: false } },
    });
    expect(seat("joiner").getByText("Sam")).toBeInTheDocument();
    expect(seat("joiner").getByText("disconnected")).toBeInTheDocument();
  });

  it("shows two Players with the same name next to their own colours", () => {
    renderFrom({
      ...waiting,
      phase: "in_progress",
      seats: {
        creator: { name: "Dorothy", connected: true },
        joiner: { name: "Dorothy", connected: true },
      },
    });
    expect(seat("creator").getByText("Dorothy (you)")).toBeInTheDocument();
    expect(seat("joiner").getAllByText("Dorothy")).toHaveLength(1);
    const swatches = [...document.querySelectorAll<HTMLElement>(".swatch")].map(
      (s) => s.style.background,
    );
    expect(new Set(swatches).size).toBe(2);
  });

  it("says Reconnecting… while the connection is lost", () => {
    renderFrom(waiting, true);
    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting…");
  });
});

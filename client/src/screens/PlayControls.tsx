import type { MatchSnapshot, Seat } from "@sl/shared";
import { useEffect, useState } from "react";
import { SEAT_LOOK } from "../board/oz";
import { describeTurn } from "../match/describe";

/** How long the Roll button waits for an answer before it can be pressed again. */
export const ROLL_RETRY_MS = 3000;

// Space and Enter already press a focused button, and type into fields; leave those alone.
function isTypingOrButton(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
  );
}

export interface PlayControlsProps {
  /** The Match as shown: it only moves on when a Turn's animation has finished. */
  match: MatchSnapshot;
  /** The latest snapshot from the server; a new one means a Roll was answered. */
  latest?: MatchSnapshot;
  /** True while a Turn is animating or waiting to; nobody can Roll until it is shown. */
  busy?: boolean;
  you: Seat;
  onRoll: () => void;
  onHome: () => void;
}

/** Whose Turn it is, the Roll button, the last Turn, or the Winner once the Match is Finished. */
export function PlayControls({
  match,
  latest = match,
  busy = false,
  you,
  onRoll,
  onHome,
}: PlayControlsProps) {
  // The snapshot the last Roll was requested from; a newer snapshot means the answer arrived.
  const [rolledFrom, setRolledFrom] = useState<MatchSnapshot | null>(null);
  const waiting = rolledFrom === latest;
  const canRoll = match.phase === "in_progress" && match.currentPlayer === you && !waiting && !busy;

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => setRolledFrom(null), ROLL_RETRY_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

  useEffect(() => {
    if (!canRoll) return;
    function onKey(event: KeyboardEvent) {
      if ((event.key !== " " && event.key !== "Enter") || isTypingOrButton(event.target)) return;
      event.preventDefault();
      setRolledFrom(latest);
      onRoll();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canRoll, latest, onRoll]);

  const lastTurn = match.lastTurn && (
    <p className="last-turn" data-testid="last-turn">
      {describeTurn(match.lastTurn, match)}
    </p>
  );

  if (match.phase === "finished" && match.winner) {
    const winner = match.seats[match.winner]?.name ?? "Someone";
    return (
      <div className="play">
        <h2 role="status" className="winner">
          <span
            className="swatch"
            style={{ background: SEAT_LOOK[match.winner].color }}
            aria-hidden
          />
          {match.winner === you ? "You win!" : `${winner} wins`}
        </h2>
        {lastTurn}
        <button type="button" className="primary" onClick={onHome}>
          Back to home
        </button>
      </div>
    );
  }

  if (match.phase !== "in_progress" || !match.currentPlayer) return null;

  const current = match.currentPlayer;
  const yourTurn = current === you;
  return (
    <div className="play">
      <div className="row turn">
        <p data-testid="turn">
          <span className="swatch" style={{ background: SEAT_LOOK[current].color }} aria-hidden />
          {yourTurn ? "Your Turn" : `${match.seats[current]?.name ?? "Someone"}'s Turn`}
        </p>
        {yourTurn && (
          <button
            type="button"
            className="primary roll"
            disabled={!canRoll}
            onClick={() => {
              setRolledFrom(latest);
              onRoll();
            }}
          >
            Roll
          </button>
        )}
      </div>
      {lastTurn}
    </div>
  );
}

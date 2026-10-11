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
  match: MatchSnapshot;
  you: Seat;
  onRoll: () => void;
  onHome: () => void;
}

/** Whose Turn it is, the Roll button, the last Turn, or the Winner once the Match is Finished. */
export function PlayControls({ match, you, onRoll, onHome }: PlayControlsProps) {
  // The snapshot the last Roll was requested from; a newer snapshot means the answer arrived.
  const [rolledFrom, setRolledFrom] = useState<MatchSnapshot | null>(null);
  const waiting = rolledFrom === match;
  const canRoll = match.phase === "in_progress" && match.currentPlayer === you && !waiting;

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
      setRolledFrom(match);
      onRoll();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canRoll, match, onRoll]);

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
              setRolledFrom(match);
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

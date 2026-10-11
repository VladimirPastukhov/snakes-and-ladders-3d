import { FINAL_CELL, JUMPS, START, resolveJump } from "./board";
import { otherSeat, type MatchPhase, type Positions, type Seat, type Turn } from "./match";

/** Everything the rules decide. The server stores it; every snapshot carries it. */
export interface GameState {
  phase: MatchPhase;
  positions: Positions;
  currentPlayer: Seat | null;
  winner: Seat | null;
  lastTurn: Turn | null;
}

/** A Match before the second Player joins: no Turns yet. */
export const WAITING_GAME: GameState = {
  phase: "waiting",
  positions: { creator: START, joiner: START },
  currentPlayer: null,
  winner: null,
  lastTurn: null,
};

/** Both Tokens at Start; `first` is the first Current Player (chosen at random by the server). */
export function startGame(first: Seat): GameState {
  return { ...WAITING_GAME, phase: "in_progress", currentPlayer: first };
}

/**
 * Plays one Turn for `seat` with the die showing `roll`: Move, then any Jump, then the
 * Turn passes on, or the Match is Finished if the Token reached or passed the Final Cell.
 * Returns null, changing nothing, unless `seat` is the Current Player of an In-progress Match.
 */
export function takeTurn(
  state: GameState,
  seat: Seat,
  roll: number,
): { state: GameState; turn: Turn } | null {
  if (state.phase !== "in_progress" || state.currentPlayer !== seat) return null;
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    throw new RangeError(`A Roll is 1 to 6, got ${roll}`);
  }

  const from = state.positions[seat];
  const landed = Math.min(from + roll, FINAL_CELL);
  const to = resolveJump(landed);
  const jump = JUMPS.find((j) => j.from === landed)?.kind ?? null;
  const turn: Turn = { seat, roll, from, landed, to, jump };
  const positions = { ...state.positions, [seat]: to };

  if (to === FINAL_CELL) {
    return {
      state: { phase: "finished", positions, currentPlayer: null, winner: seat, lastTurn: turn },
      turn,
    };
  }
  return {
    state: { ...state, positions, currentPlayer: otherSeat(seat), lastTurn: turn },
    turn,
  };
}

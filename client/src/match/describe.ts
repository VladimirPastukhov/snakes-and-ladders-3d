import type { MatchSnapshot, Turn } from "@sl/shared";

const JUMP_WORD = { ladder: "Ladder", snake: "Snake" } as const;

const cellName = (cell: number) => (cell === 0 ? "Start" : String(cell));

/** One line for the last Turn, e.g. "Alex rolled 3: Start → 3 → Ladder → 11". */
export function describeTurn(turn: Turn, match: MatchSnapshot): string {
  const name = match.seats[turn.seat]?.name ?? "Someone";
  const path = [cellName(turn.from), cellName(turn.landed)];
  if (turn.jump) path.push(JUMP_WORD[turn.jump], cellName(turn.to));
  return `${name} rolled ${turn.roll}: ${path.join(" → ")}`;
}

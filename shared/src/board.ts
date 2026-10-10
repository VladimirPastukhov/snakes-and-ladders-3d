/** Number of Cells on the Board; Cell 30 is the Final Cell. */
export const CELL_COUNT = 30;

/** The off-board position where every Token begins. */
export const START = 0;

export const FINAL_CELL = CELL_COUNT;

export type JumpKind = "ladder" | "snake";

/** A Snake or Ladder: a Token landing on `from` is sent to `to`. */
export interface Jump {
  kind: JumpKind;
  from: number;
  to: number;
}

export const JUMPS: readonly Jump[] = [
  { kind: "ladder", from: 3, to: 11 },
  { kind: "ladder", from: 16, to: 23 },
  { kind: "ladder", from: 24, to: 29 },
  { kind: "snake", from: 18, to: 8 },
  { kind: "snake", from: 22, to: 13 },
  { kind: "snake", from: 27, to: 19 },
];

const jumpByFrom = new Map(JUMPS.map((jump) => [jump.from, jump]));

/** Where a Token that lands on `cell` ends up after any Snake or Ladder. */
export function resolveJump(cell: number): number {
  return jumpByFrom.get(cell)?.to ?? cell;
}

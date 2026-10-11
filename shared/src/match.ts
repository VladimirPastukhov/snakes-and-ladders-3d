import { z } from "zod";
import { FINAL_CELL, START } from "./board";

// The two places for a Player in a Match. The client shows them as Dorothy and Scarecrow.
export const SEATS = ["creator", "joiner"] as const;
export const seatSchema = z.enum(SEATS);
export type Seat = z.infer<typeof seatSchema>;

export const matchPhaseSchema = z.enum(["waiting", "in_progress", "finished"]);
export type MatchPhase = z.infer<typeof matchPhaseSchema>;

// No 0, O, 1, I or L, so a code read aloud or from a phone screen can't be mistyped.
export const MATCH_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const MATCH_CODE_LENGTH = 5;
const MATCH_CODE_PATTERN = new RegExp(`^[${MATCH_CODE_ALPHABET}]{${MATCH_CODE_LENGTH}}$`);

/** Upper-cases and trims a typed code; returns null if it can't be a Match Code. */
export function normaliseMatchCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return MATCH_CODE_PATTERN.test(code) ? code : null;
}

export const matchCodeSchema = z.string().regex(MATCH_CODE_PATTERN);

export const NAME_MAX_LENGTH = 20;
export const displayNameSchema = z.string().trim().min(1).max(NAME_MAX_LENGTH);

export function otherSeat(seat: Seat): Seat {
  return seat === "creator" ? "joiner" : "creator";
}

const cellSchema = z.number().int().min(START).max(FINAL_CELL);

/** What one Turn did: the Roll, the Move (`from` → `landed`) and any Jump (`landed` → `to`). */
export const turnSchema = z.object({
  seat: seatSchema,
  roll: z.number().int().min(1).max(6),
  from: cellSchema,
  landed: cellSchema,
  to: cellSchema,
  jump: z.enum(["ladder", "snake"]).nullable(),
});
export type Turn = z.infer<typeof turnSchema>;

export const positionsSchema = z.object({ creator: cellSchema, joiner: cellSchema });
export type Positions = z.infer<typeof positionsSchema>;

export const seatViewSchema = z.object({
  name: z.string(),
  connected: z.boolean(),
});
export type SeatView = z.infer<typeof seatViewSchema>;

export const matchSnapshotSchema = z.object({
  code: matchCodeSchema,
  phase: matchPhaseSchema,
  seats: z.object({
    creator: seatViewSchema.optional(),
    joiner: seatViewSchema.optional(),
  }),
  positions: positionsSchema,
  currentPlayer: seatSchema.nullable(),
  winner: seatSchema.nullable(),
  lastTurn: turnSchema.nullable(),
});
export type MatchSnapshot = z.infer<typeof matchSnapshotSchema>;

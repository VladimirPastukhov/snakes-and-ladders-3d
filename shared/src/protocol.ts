import { z } from "zod";
import { displayNameSchema, matchCodeSchema, matchSnapshotSchema, seatSchema } from "./match";

// A random secret the browser keeps; the server stores only its hash.
export const sessionTokenSchema = z.string().min(16).max(128);

// POST /api/matches
export const createMatchRequestSchema = z.object({
  token: sessionTokenSchema,
  name: displayNameSchema,
});
export type CreateMatchRequest = z.infer<typeof createMatchRequestSchema>;

export const createMatchResponseSchema = z.object({ code: matchCodeSchema });
export type CreateMatchResponse = z.infer<typeof createMatchResponseSchema>;

// Client → server, sent on every (re)connect.
export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hello"), token: sessionTokenSchema, name: displayNameSchema }),
  // Ask to Roll; the server throws the die, and ignores it unless it is the sender's Turn.
  z.object({ type: z.literal("roll") }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

export const matchEventSchema = z.enum([
  "joined",
  "connected",
  "disconnected",
  "renamed",
  "rolled",
]);
export type MatchEvent = z.infer<typeof matchEventSchema>;

export const rejectReasonSchema = z.enum(["full", "not_found"]);
export type RejectReason = z.infer<typeof rejectReasonSchema>;

// Server → client. Every message carries the full snapshot, never a partial one.
export const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("welcome"), you: seatSchema, match: matchSnapshotSchema }),
  z.object({ type: z.literal("update"), event: matchEventSchema, match: matchSnapshotSchema }),
  z.object({ type: z.literal("rejected"), reason: rejectReasonSchema }),
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** WebSocket close code telling an older tab that a newer one took its seat. */
export const REPLACED_CLOSE_CODE = 4001;

function parseJson<T>(schema: z.ZodType<T>, raw: string): T | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseClientMessage(raw: string): ClientMessage | null {
  return parseJson(clientMessageSchema, raw);
}

export function parseServerMessage(raw: string): ServerMessage | null {
  return parseJson(serverMessageSchema, raw);
}

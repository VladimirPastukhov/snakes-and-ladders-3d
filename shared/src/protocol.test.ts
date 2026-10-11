import { describe, expect, it } from "vitest";
import type { MatchSnapshot } from "./match";
import { parseClientMessage, parseServerMessage, type ServerMessage } from "./protocol";

const TOKEN = "0b6f3a52-5d0e-4f43-9a63-2b8d8b2c9f11";
const match: MatchSnapshot = {
  code: "K7QXM",
  phase: "in_progress",
  seats: {
    creator: { name: "Alex", connected: true },
    joiner: { name: "Sam", connected: false },
  },
};

describe("client messages", () => {
  it("round-trip hello and trim the name", () => {
    const raw = JSON.stringify({ type: "hello", token: TOKEN, name: " Alex " });
    expect(parseClientMessage(raw)).toEqual({ type: "hello", token: TOKEN, name: "Alex" });
  });

  it.each([
    ["not JSON", "hello"],
    ["unknown type", JSON.stringify({ type: "roll" })],
    ["missing token", JSON.stringify({ type: "hello", name: "Alex" })],
    ["short token", JSON.stringify({ type: "hello", token: "abc", name: "Alex" })],
    ["empty name", JSON.stringify({ type: "hello", token: TOKEN, name: "  " })],
    ["long name", JSON.stringify({ type: "hello", token: TOKEN, name: "x".repeat(21) })],
  ])("reject %s", (_, raw) => {
    expect(parseClientMessage(raw)).toBeNull();
  });
});

describe("server messages", () => {
  it.each<ServerMessage>([
    { type: "welcome", you: "creator", match },
    { type: "update", event: "joined", match },
    { type: "update", event: "disconnected", match: { ...match, seats: {} } },
    { type: "rejected", reason: "full" },
    { type: "rejected", reason: "not_found" },
  ])("round-trip $type", (message) => {
    expect(parseServerMessage(JSON.stringify(message))).toEqual(message);
  });

  it("reject an unknown seat or a bad code", () => {
    expect(
      parseServerMessage(JSON.stringify({ type: "welcome", you: "dorothy", match })),
    ).toBeNull();
    expect(
      parseServerMessage(
        JSON.stringify({ type: "welcome", you: "creator", match: { ...match, code: "k7qxm" } }),
      ),
    ).toBeNull();
  });
});

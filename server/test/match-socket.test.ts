import { exports } from "cloudflare:workers";
import { REPLACED_CLOSE_CODE } from "@sl/shared";
import { describe, expect, it } from "vitest";
import { ORIGIN, TestSocket, createMatch, newToken } from "./socket";

describe("joining a Match over WebSocket", () => {
  it("seats the creator, then the joiner, and tells both", async () => {
    const alex = newToken();
    const code = await createMatch(alex, "Alex");

    const [alexSocket, alexWelcome] = await TestSocket.hello(code, alex, "Alex");
    expect(alexWelcome).toEqual({
      type: "welcome",
      you: "creator",
      match: {
        code,
        phase: "waiting",
        seats: { creator: { name: "Alex", connected: true } },
        positions: { creator: 0, joiner: 0 },
        currentPlayer: null,
        winner: null,
        lastTurn: null,
      },
    });

    const [, samWelcome] = await TestSocket.hello(code, newToken(), "Sam");
    if (samWelcome.type !== "welcome") throw new Error("not welcomed");
    const both = {
      code,
      phase: "in_progress",
      seats: {
        creator: { name: "Alex", connected: true },
        joiner: { name: "Sam", connected: true },
      },
      positions: { creator: 0, joiner: 0 },
      currentPlayer: samWelcome.match.currentPlayer,
      winner: null,
      lastTurn: null,
    };
    expect(["creator", "joiner"]).toContain(both.currentPlayer);
    expect(samWelcome).toEqual({ type: "welcome", you: "joiner", match: both });
    expect(await alexSocket.next()).toEqual({ type: "update", event: "joined", match: both });
  });

  it("matches the code case-insensitively", async () => {
    const alex = newToken();
    const code = await createMatch(alex, "Alex");
    const [, welcome] = await TestSocket.hello(code.toLowerCase(), alex, "Alex");
    expect(welcome).toMatchObject({ type: "welcome", you: "creator", match: { code } });
  });

  it("refuses a third person with full", async () => {
    const code = await createMatch(newToken(), "Alex");
    await TestSocket.hello(code, newToken(), "Sam");
    const [third, reply] = await TestSocket.hello(code, newToken(), "Kim");
    expect(reply).toEqual({ type: "rejected", reason: "full" });
    await third.closed;
  });

  it.each([
    ["an unknown code", "ZZZZ9"],
    ["a malformed code", "K7QX0"],
  ])("refuses %s with not_found", async (_, code) => {
    const [socket, reply] = await TestSocket.hello(code, newToken(), "Kim");
    expect(reply).toEqual({ type: "rejected", reason: "not_found" });
    await socket.closed;
  });

  it("gives a returning Player their own seat and renames them", async () => {
    const alex = newToken();
    const code = await createMatch(alex, "Alex");
    const sam = newToken();
    const [samSocket] = await TestSocket.hello(code, sam, "Sam");

    const [, welcome] = await TestSocket.hello(code, alex, "Alexandra");
    expect(welcome).toMatchObject({
      you: "creator",
      match: { seats: { creator: { name: "Alexandra" } } },
    });
    expect(await samSocket.next()).toMatchObject({
      type: "update",
      event: "renamed",
      match: { seats: { creator: { name: "Alexandra", connected: true } } },
    });
  });

  it("lets the newest tab hold the seat and closes the older one", async () => {
    const alex = newToken();
    const code = await createMatch(alex, "Alex");
    const [samSocket] = await TestSocket.hello(code, newToken(), "Sam");
    const [oldTab] = await TestSocket.hello(code, alex, "Alex");
    await samSocket.next(); // Alex connected

    const [, welcome] = await TestSocket.hello(code, alex, "Alex");
    expect(welcome).toMatchObject({ type: "welcome", you: "creator" });
    expect(await oldTab.closed).toBe(REPLACED_CLOSE_CODE);
    await samSocket.silent();
  });

  it("closes the socket on an invalid message", async () => {
    const code = await createMatch(newToken(), "Alex");
    const socket = await TestSocket.open(code);
    socket.ws.send(JSON.stringify({ type: "hello", name: "no token" }));
    expect(await socket.closed).toBe(1007);
  });

  it("answers a plain GET with 426", async () => {
    const response = await exports.default.fetch(`${ORIGIN}/api/matches/K7QXM/ws`);
    expect(response.status).toBe(426);
  });
});

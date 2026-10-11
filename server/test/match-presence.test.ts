import { env } from "cloudflare:workers";
import { evictDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { TestSocket, seatedPair } from "./socket";

function stub(code: string) {
  return env.MATCH.get(env.MATCH.idFromName(code));
}

describe("presence", () => {
  it("shows a Player disconnected when their socket closes, keeping their seat", async () => {
    const { alexSocket, samSocket } = await seatedPair();
    samSocket.close();
    expect(await alexSocket.next()).toMatchObject({
      type: "update",
      event: "disconnected",
      match: {
        seats: { creator: { connected: true }, joiner: { name: "Sam", connected: false } },
      },
    });
  });

  it("shows them connected again when they come back", async () => {
    const { code, sam, alexSocket, samSocket } = await seatedPair();
    samSocket.close();
    await alexSocket.next();
    const [, welcome] = await TestSocket.hello(code, sam, "Sam");
    expect(welcome).toMatchObject({ you: "joiner" });
    expect(await alexSocket.next()).toMatchObject({
      event: "connected",
      match: { seats: { joiner: { connected: true } } },
    });
  });
});

describe("reloading the Match from storage", () => {
  it("keeps sockets and presence across hibernation", async () => {
    const { code, alexSocket, samSocket } = await seatedPair();
    await evictDurableObject(stub(code));

    samSocket.close();
    expect(await alexSocket.next()).toMatchObject({
      event: "disconnected",
      match: {
        phase: "in_progress",
        seats: { creator: { name: "Alex", connected: true }, joiner: { connected: false } },
      },
    });
  });

  it("returns both Players to their seats after a restart closes every socket", async () => {
    const { code, alex, sam, alexSocket, samSocket } = await seatedPair();
    await evictDurableObject(stub(code), { webSockets: "close" });
    await Promise.all([alexSocket.closed, samSocket.closed]);

    const [alexAgain, alexWelcome] = await TestSocket.hello(code, alex, "Alex");
    expect(alexWelcome).toMatchObject({
      you: "creator",
      match: { seats: { creator: { connected: true }, joiner: { name: "Sam", connected: false } } },
    });
    const [, samWelcome] = await TestSocket.hello(code, sam, "Sam");
    expect(samWelcome).toMatchObject({ you: "joiner", match: { phase: "in_progress" } });
    expect(await alexAgain.next()).toMatchObject({ event: "connected" });
  });
});

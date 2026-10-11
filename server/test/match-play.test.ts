import { env } from "cloudflare:workers";
import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { otherSeat, resolveJump, type MatchSnapshot, type ServerMessage } from "@sl/shared";
import { describe, expect, it } from "vitest";
import { hashToken } from "../src/match";
import { TestSocket, newToken, seatedPair } from "./socket";

function stub(code: string) {
  return env.MATCH.get(env.MATCH.idFromName(code));
}

function snapshotOf(message: ServerMessage): MatchSnapshot {
  if (message.type === "rejected") throw new Error("rejected");
  return message.match;
}

async function seatedGame() {
  const pair = await seatedPair();
  const current = pair.start.currentPlayer!;
  const sockets = { creator: pair.alexSocket, joiner: pair.samSocket };
  return { ...pair, current, sockets };
}

const roll = (socket: TestSocket) => socket.ws.send(JSON.stringify({ type: "roll" }));

describe("starting the game", () => {
  it("picks a first Current Player when the joiner arrives, with both Tokens at Start", async () => {
    const { start, samSocket } = await seatedGame();
    expect(start).toMatchObject({
      phase: "in_progress",
      positions: { creator: 0, joiner: 0 },
      winner: null,
      lastTurn: null,
    });
    expect(["creator", "joiner"]).toContain(start.currentPlayer);
    await samSocket.silent(50);
  });
});

describe("rolling", () => {
  it("plays the Current Player's Roll and tells both Players", async () => {
    const { current, sockets } = await seatedGame();
    roll(sockets[current]);
    const [a, b] = await Promise.all([sockets.creator.next(), sockets.joiner.next()]);
    expect(a).toEqual(b);
    expect(a).toMatchObject({ type: "update", event: "rolled" });
    const match = snapshotOf(a);
    const turn = match.lastTurn!;
    expect(turn.seat).toBe(current);
    expect(turn.roll).toBeGreaterThanOrEqual(1);
    expect(turn.roll).toBeLessThanOrEqual(6);
    expect(turn).toMatchObject({ from: 0, landed: turn.roll, to: resolveJump(turn.roll) });
    expect(match.positions[current]).toBe(turn.to);
    expect(match.positions[otherSeat(current)]).toBe(0);
    expect(match.currentPlayer).toBe(otherSeat(current));
  });

  it("ignores a Roll from the other Player", async () => {
    const { current, sockets } = await seatedGame();
    roll(sockets[otherSeat(current)]);
    await Promise.all([sockets.creator.silent(), sockets.joiner.silent()]);
  });

  it("plays only the first of two quick presses", async () => {
    const { current, sockets } = await seatedGame();
    roll(sockets[current]);
    roll(sockets[current]);
    const update = snapshotOf(await sockets[otherSeat(current)].next());
    expect(update.currentPlayer).toBe(otherSeat(current));
    await Promise.all([sockets[current].next(), sockets[otherSeat(current)].silent()]);
    await sockets[current].silent();
  });

  it("alternates Turns, each Move starting where the last one ended", async () => {
    const { current, sockets } = await seatedGame();
    let seat = current;
    const positions = { creator: 0, joiner: 0 };
    for (let i = 0; i < 8; i++) {
      roll(sockets[seat]);
      const match = snapshotOf(await sockets[otherSeat(seat)].next());
      await sockets[seat].next();
      if (match.phase === "finished") break;
      const turn = match.lastTurn!;
      expect(turn.seat).toBe(seat);
      expect(turn.from).toBe(positions[seat]);
      positions[seat] = turn.to;
      expect(match.positions).toEqual(positions);
      seat = otherSeat(seat);
      expect(match.currentPlayer).toBe(seat);
    }
  });

  it("ignores a Roll from a socket that has not said hello", async () => {
    const { code, sockets } = await seatedGame();
    const stranger = await TestSocket.open(code);
    roll(stranger);
    await Promise.all([sockets.creator.silent(), sockets.joiner.silent(), stranger.silent()]);
  });
});

describe("winning and keeping the game", () => {
  it("wins from Cell 29 on any Roll, and refuses Rolls afterwards", async () => {
    const { code, sockets } = await seatedGame();
    await runInDurableObject(stub(code), async (_, state) => {
      const stored = (await state.storage.get<Record<string, unknown>>("match"))!;
      await state.storage.put("match", {
        ...stored,
        positions: { creator: 29, joiner: 4 },
        currentPlayer: "creator",
      });
    });
    await evictDurableObject(stub(code));

    roll(sockets.creator);
    const match = snapshotOf(await sockets.joiner.next());
    await sockets.creator.next();
    expect(match).toMatchObject({
      phase: "finished",
      winner: "creator",
      currentPlayer: null,
      positions: { creator: 30, joiner: 4 },
      lastTurn: { seat: "creator", from: 29, landed: 30, to: 30 },
    });

    roll(sockets.joiner);
    roll(sockets.creator);
    await Promise.all([sockets.creator.silent(), sockets.joiner.silent()]);
  });

  it("keeps positions and the Current Player when the object is evicted", async () => {
    const { code, alex, current, sockets } = await seatedGame();
    roll(sockets[current]);
    const before = snapshotOf(await sockets.creator.next());
    await evictDurableObject(stub(code), { webSockets: "close" });

    const [, welcome] = await TestSocket.hello(code, alex, "Alex");
    const after = snapshotOf(welcome);
    expect(after.positions).toEqual(before.positions);
    expect(after.currentPlayer).toBe(before.currentPlayer);
    expect(after.lastTurn).toEqual(before.lastTurn);
  });

  it("upgrades a Match stored before M3", async () => {
    const alex = newToken();
    const code = "UPGR2";
    await runInDurableObject(stub(code), async (_, state) => {
      await state.storage.put("match", {
        code,
        phase: "in_progress",
        seats: {
          creator: { tokenHash: await hashToken(alex), name: "Alex" },
          joiner: { tokenHash: await hashToken(newToken()), name: "Sam" },
        },
      });
    });

    const [, welcome] = await TestSocket.hello(code, alex, "Alex");
    const match = snapshotOf(welcome);
    expect(match.positions).toEqual({ creator: 0, joiner: 0 });
    expect(["creator", "joiner"]).toContain(match.currentPlayer);
    expect(match).toMatchObject({ winner: null, lastTurn: null });

    const stored = await runInDurableObject(stub(code), (_, state) =>
      state.storage.get<{ currentPlayer: string }>("match"),
    );
    expect(stored?.currentPlayer).toBe(match.currentPlayer);
  });
});

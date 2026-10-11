import { REPLACED_CLOSE_CODE, type ClientMessage, type ServerMessage } from "@sl/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectToMatch, matchSocketUrl } from "./connection";

class FakeSocket extends EventTarget {
  sent: string[] = [];
  closedWith?: number;
  readyState: number = WebSocket.CONNECTING;
  constructor(readonly url: string) {
    super();
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code?: number) {
    this.closedWith = code;
  }
  // Test controls
  serverOpens() {
    this.readyState = WebSocket.OPEN;
    this.dispatchEvent(new Event("open"));
  }
  serverSends(message: ServerMessage) {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(message) }));
  }
  serverCloses(code = 1006) {
    this.dispatchEvent(new CloseEvent("close", { code }));
  }
}

const hello: ClientMessage = { type: "hello", token: "0b6f3a52-5d0e-4f43-9a63", name: "Alex" };
const welcome: ServerMessage = {
  type: "welcome",
  you: "creator",
  match: {
    code: "K7QXM",
    phase: "waiting",
    seats: { creator: { name: "Alex", connected: true } },
    positions: { creator: 0, joiner: 0 },
    currentPlayer: null,
    winner: null,
    lastTurn: null,
  },
};

function setup() {
  const sockets: FakeSocket[] = [];
  const handlers = { onMessage: vi.fn(), onLost: vi.fn(), onReplaced: vi.fn() };
  const connection = connectToMatch(
    "ws://x/api/matches/K7QXM/ws",
    () => hello,
    handlers,
    (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
  );
  const last = () => sockets[sockets.length - 1]!;
  return { sockets, handlers, connection, last };
}

describe("connectToMatch", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("says hello when the socket opens and passes messages on", () => {
    const { last, handlers } = setup();
    last().serverOpens();
    expect(last().sent).toEqual([JSON.stringify(hello)]);
    last().serverSends(welcome);
    expect(handlers.onMessage).toHaveBeenCalledWith(welcome);
  });

  it("reconnects with backoff from 0.5 s doubling to 5 s, and says hello again", () => {
    const { sockets, last, handlers } = setup();
    const delays = [500, 1000, 2000, 4000, 5000, 5000];
    for (const delay of delays) {
      const count = sockets.length;
      last().serverCloses();
      vi.advanceTimersByTime(delay - 1);
      expect(sockets).toHaveLength(count);
      vi.advanceTimersByTime(1);
      expect(sockets).toHaveLength(count + 1);
    }
    expect(handlers.onLost).toHaveBeenCalledTimes(delays.length);
    last().serverOpens();
    expect(last().sent).toEqual([JSON.stringify(hello)]);
  });

  it("starts the backoff over after a welcome", () => {
    const { sockets, last } = setup();
    last().serverCloses();
    vi.advanceTimersByTime(500);
    last().serverCloses();
    vi.advanceTimersByTime(1000);
    last().serverSends(welcome);
    last().serverCloses();
    vi.advanceTimersByTime(500);
    expect(sockets).toHaveLength(4);
  });

  it("stops after rejected", () => {
    const { sockets, last, handlers } = setup();
    last().serverSends({ type: "rejected", reason: "full" });
    last().serverCloses(1000);
    vi.advanceTimersByTime(10_000);
    expect(sockets).toHaveLength(1);
    expect(handlers.onLost).not.toHaveBeenCalled();
  });

  it("stops after being replaced by a newer tab", () => {
    const { sockets, last, handlers } = setup();
    last().serverCloses(REPLACED_CLOSE_CODE);
    vi.advanceTimersByTime(10_000);
    expect(sockets).toHaveLength(1);
    expect(handlers.onReplaced).toHaveBeenCalledOnce();
    expect(handlers.onLost).not.toHaveBeenCalled();
  });

  it("stops when closed by the page", () => {
    const { sockets, last, connection, handlers } = setup();
    last().serverCloses();
    connection.close();
    vi.advanceTimersByTime(10_000);
    expect(sockets).toHaveLength(1);
    expect(handlers.onLost).toHaveBeenCalledOnce();
  });
});

describe("Connection.send", () => {
  it("sends on an open socket and drops messages while connecting", () => {
    const { connection, last } = setup();
    connection.send({ type: "roll" });
    expect(last().sent).toEqual([]);
    last().serverOpens();
    connection.send({ type: "roll" });
    expect(last().sent).toEqual([JSON.stringify(hello), JSON.stringify({ type: "roll" })]);
  });
});

describe("matchSocketUrl", () => {
  it("uses wss on https", () => {
    expect(matchSocketUrl("K7QXM", { protocol: "https:", host: "game.dev" } as Location)).toBe(
      "wss://game.dev/api/matches/K7QXM/ws",
    );
    expect(matchSocketUrl("K7QXM", { protocol: "http:", host: "localhost:5173" } as Location)).toBe(
      "ws://localhost:5173/api/matches/K7QXM/ws",
    );
  });
});

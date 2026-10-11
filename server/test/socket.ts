import { exports } from "cloudflare:workers";
import { parseServerMessage, type ServerMessage } from "@sl/shared";

export const ORIGIN = "http://example.com";

export async function createMatch(token: string, name: string): Promise<string> {
  const response = await exports.default.fetch(`${ORIGIN}/api/matches`, {
    method: "POST",
    body: JSON.stringify({ token, name }),
  });
  if (response.status !== 201) throw new Error(`create failed: ${response.status}`);
  return ((await response.json()) as { code: string }).code;
}

export function newToken(): string {
  return crypto.randomUUID();
}

/** A test client's end of a Match WebSocket, with its messages queued for awaiting. */
export class TestSocket {
  private queue: ServerMessage[] = [];
  private waiters: ((message: ServerMessage) => void)[] = [];
  readonly closed: Promise<number>;

  constructor(readonly ws: WebSocket) {
    ws.addEventListener("message", (event) => {
      const message = parseServerMessage(event.data as string);
      if (!message) throw new Error(`unparseable message: ${String(event.data)}`);
      const waiter = this.waiters.shift();
      if (waiter) waiter(message);
      else this.queue.push(message);
    });
    this.closed = new Promise((resolve) => ws.addEventListener("close", (e) => resolve(e.code)));
    ws.accept();
  }

  static async open(code: string): Promise<TestSocket> {
    const response = await exports.default.fetch(`${ORIGIN}/api/matches/${code}/ws`, {
      headers: { Upgrade: "websocket" },
    });
    if (!response.webSocket) throw new Error(`no WebSocket: ${response.status}`);
    return new TestSocket(response.webSocket);
  }

  /** Opens a socket and says hello; resolves with the server's first reply. */
  static async hello(
    code: string,
    token: string,
    name: string,
  ): Promise<[TestSocket, ServerMessage]> {
    const socket = await TestSocket.open(code);
    socket.ws.send(JSON.stringify({ type: "hello", token, name }));
    return [socket, await socket.next()];
  }

  next(timeoutMs = 2000): Promise<ServerMessage> {
    const queued = this.queue.shift();
    if (queued) return Promise.resolve(queued);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("no message in time")), timeoutMs);
      this.waiters.push((message) => {
        clearTimeout(timer);
        resolve(message);
      });
    });
  }

  /** Asserts nothing arrives within a short window. */
  async silent(ms = 200): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
    if (this.queue.length) throw new Error(`unexpected message: ${JSON.stringify(this.queue[0])}`);
  }

  close(): void {
    this.ws.close(1000, "test done");
  }
}

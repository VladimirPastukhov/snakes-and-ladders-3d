import {
  REPLACED_CLOSE_CODE,
  parseServerMessage,
  type ClientMessage,
  type ServerMessage,
} from "@sl/shared";

const FIRST_RETRY_MS = 500;
const MAX_RETRY_MS = 5000;

export interface ConnectionHandlers {
  onMessage: (message: ServerMessage) => void;
  /** The socket dropped; a reconnect is scheduled. */
  onLost: () => void;
  /** A newer tab took the seat; no reconnect. */
  onReplaced: () => void;
}

export interface Connection {
  close: () => void;
}

export function matchSocketUrl(code: string, location: Location = window.location): string {
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${location.host}/api/matches/${encodeURIComponent(code)}/ws`;
}

/**
 * Keeps one WebSocket to a Match open. Says hello on every (re)connect and retries
 * with backoff until closed, rejected, or replaced.
 */
export function connectToMatch(
  url: string,
  hello: () => ClientMessage,
  handlers: ConnectionHandlers,
  createSocket: (url: string) => WebSocket = (u) => new WebSocket(u),
): Connection {
  let socket: WebSocket | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  let stopped = false;

  function open(): void {
    const ws = createSocket(url);
    socket = ws;
    ws.addEventListener("open", () => ws.send(JSON.stringify(hello())));
    ws.addEventListener("message", (event) => {
      const message = typeof event.data === "string" ? parseServerMessage(event.data) : null;
      if (!message) return;
      if (message.type === "welcome") failures = 0;
      if (message.type === "rejected") stopped = true;
      handlers.onMessage(message);
    });
    ws.addEventListener("close", (event) => {
      if (stopped || socket !== ws) return;
      if (event.code === REPLACED_CLOSE_CODE) {
        stopped = true;
        handlers.onReplaced();
        return;
      }
      handlers.onLost();
      const delay = Math.min(MAX_RETRY_MS, FIRST_RETRY_MS * 2 ** failures);
      failures++;
      retryTimer = setTimeout(open, delay);
    });
  }

  open();
  return {
    close() {
      stopped = true;
      clearTimeout(retryTimer);
      socket?.close(1000, "Left the Match");
    },
  };
}

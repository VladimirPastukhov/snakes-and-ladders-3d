import { DurableObject } from "cloudflare:workers";
import {
  REPLACED_CLOSE_CODE,
  SEATS,
  parseClientMessage,
  type MatchEvent,
  type MatchPhase,
  type MatchSnapshot,
  type RejectReason,
  type Seat,
  type ServerMessage,
} from "@sl/shared";

interface StoredSeat {
  tokenHash: string;
  name: string;
}

interface StoredMatch {
  code: string;
  phase: MatchPhase;
  seats: Partial<Record<Seat, StoredSeat>>;
}

// Kept on each socket, so it survives hibernation. Empty until the socket says hello.
interface Attachment {
  seat?: Seat;
}

const MATCH_KEY = "match";

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function seatOf(ws: WebSocket): Seat | undefined {
  return (ws.deserializeAttachment() as Attachment | null)?.seat;
}

function send(ws: WebSocket, message: ServerMessage): void {
  try {
    ws.send(JSON.stringify(message));
  } catch {
    // The socket is already closing; its close handler deals with presence.
  }
}

/**
 * One Match: who holds which seat, and every socket connected to it.
 * Seats are stored; "connected" is derived from the live sockets, never stored.
 */
export class Match extends DurableObject<Env> {
  private match: StoredMatch | null | undefined;

  private async load(): Promise<StoredMatch | null> {
    if (this.match === undefined) {
      this.match = (await this.ctx.storage.get<StoredMatch>(MATCH_KEY)) ?? null;
    }
    return this.match;
  }

  private async save(match: StoredMatch): Promise<void> {
    this.match = match;
    await this.ctx.storage.put(MATCH_KEY, match);
  }

  /** Creates the Match with its creator seated; false if this code already holds one. */
  async create(code: string, token: string, name: string): Promise<boolean> {
    const tokenHash = await hashToken(token);
    if (await this.load()) return false;
    await this.save({ code, phase: "waiting", seats: { creator: { tokenHash, name } } });
    return true;
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket", { status: 426 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({} satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const hello = typeof message === "string" ? parseClientMessage(message) : null;
    if (!hello) {
      ws.close(1007, "Invalid message");
      return;
    }
    // Hash before loading: after load() every step up to save() runs without yielding.
    const tokenHash = await hashToken(hello.token);
    const match = await this.load();
    if (!match) return this.reject(ws, "not_found");

    let seat = SEATS.find((s) => match.seats[s]?.tokenHash === tokenHash);
    let event: MatchEvent | undefined;
    if (seat) {
      const held = match.seats[seat]!;
      if (held.name !== hello.name) {
        event = "renamed";
        await this.save({
          ...match,
          seats: { ...match.seats, [seat]: { ...held, name: hello.name } },
        });
      } else if (!this.isConnected(seat)) {
        event = "connected";
      }
      this.replaceOlderSockets(seat, ws);
    } else if (!match.seats.joiner) {
      seat = "joiner";
      event = "joined";
      await this.save({
        ...match,
        phase: "in_progress",
        seats: { ...match.seats, joiner: { tokenHash, name: hello.name } },
      });
    } else {
      return this.reject(ws, "full");
    }

    ws.serializeAttachment({ seat } satisfies Attachment);
    const snapshot = this.snapshot(this.match!);
    send(ws, { type: "welcome", you: seat, match: snapshot });
    if (event) this.broadcast({ type: "update", event, match: snapshot }, ws);
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    await this.dropSocket(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.dropSocket(ws);
  }

  private async dropSocket(ws: WebSocket): Promise<void> {
    const seat = seatOf(ws);
    ws.serializeAttachment({} satisfies Attachment);
    try {
      ws.close(1000, "Bye");
    } catch {
      // Already closed.
    }
    const match = await this.load();
    if (!match || !seat || this.isConnected(seat)) return;
    this.broadcast({ type: "update", event: "disconnected", match: this.snapshot(match) });
  }

  private reject(ws: WebSocket, reason: RejectReason): void {
    send(ws, { type: "rejected", reason });
    ws.close(1000, reason);
  }

  /** The newest socket holds the seat; older ones are told and closed. */
  private replaceOlderSockets(seat: Seat, newest: WebSocket): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === newest || seatOf(ws) !== seat) continue;
      ws.serializeAttachment({} satisfies Attachment);
      try {
        ws.close(REPLACED_CLOSE_CODE, "Replaced by a newer tab");
      } catch {
        // Already closed.
      }
    }
  }

  private seatedSockets(): WebSocket[] {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws.readyState === WebSocket.OPEN && seatOf(ws) !== undefined);
  }

  private isConnected(seat: Seat): boolean {
    return this.seatedSockets().some((ws) => seatOf(ws) === seat);
  }

  private snapshot(match: StoredMatch): MatchSnapshot {
    const seats: MatchSnapshot["seats"] = {};
    for (const seat of SEATS) {
      const held = match.seats[seat];
      if (held) seats[seat] = { name: held.name, connected: this.isConnected(seat) };
    }
    return { code: match.code, phase: match.phase, seats };
  }

  private broadcast(message: ServerMessage, except?: WebSocket): void {
    for (const ws of this.seatedSockets()) if (ws !== except) send(ws, message);
  }
}

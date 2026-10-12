import type { MatchEvent, MatchSnapshot, Seat, ServerMessage } from "@sl/shared";

export type MatchStatus = "connecting" | "seated" | "full" | "not_found" | "replaced";

/** What the Match screen shows. `you` and `match` survive a reconnect, so the Board stays put. */
export interface MatchState {
  status: MatchStatus;
  you?: Seat;
  match?: MatchSnapshot;
  /** How `match` arrived: a fresh `welcome` (load or reconnect) or the event of an `update`. */
  arrival?: "welcome" | MatchEvent;
}

export type MatchAction =
  | { type: "message"; message: ServerMessage }
  | { type: "connection_lost" }
  | { type: "replaced" }
  | { type: "reset" };

export const initialMatchState: MatchState = { status: "connecting" };

const FINAL: readonly MatchStatus[] = ["full", "not_found", "replaced"];

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  if (action.type === "reset") return initialMatchState;
  if (FINAL.includes(state.status)) return state;
  switch (action.type) {
    case "message": {
      const { message } = action;
      switch (message.type) {
        case "welcome":
          return { status: "seated", you: message.you, match: message.match, arrival: "welcome" };
        case "update":
          return { ...state, match: message.match, arrival: message.event };
        case "rejected":
          return { status: message.reason };
      }
      break;
    }
    case "connection_lost":
      return { ...state, status: "connecting" };
    case "replaced":
      return { status: "replaced" };
  }
  return state;
}

/** Reconnecting means we were seated before and are trying to get back. */
export function isReconnecting(state: MatchState): boolean {
  return state.status === "connecting" && state.you !== undefined;
}

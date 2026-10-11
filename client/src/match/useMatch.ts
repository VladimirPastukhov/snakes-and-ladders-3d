import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Identity } from "../identity";
import { connectToMatch, matchSocketUrl, type Connection } from "./connection";
import { initialMatchState, matchReducer, type MatchState } from "./state";

/** Connects to the Match while `code` is set; returns what the Match screen shows and a way to Roll. */
export function useMatch(
  code: string | null,
  identity: Identity,
): { state: MatchState; roll: () => void } {
  const [state, dispatch] = useReducer(matchReducer, initialMatchState);
  const connectionRef = useRef<Connection | null>(null);

  useEffect(() => {
    if (!code) return;
    dispatch({ type: "reset" });
    const connection = connectToMatch(
      matchSocketUrl(code),
      () => ({ type: "hello", token: identity.token, name: identity.name }),
      {
        onMessage: (message) => {
          if (message.type === "welcome") identity.rememberMatch(code);
          dispatch({ type: "message", message });
        },
        onLost: () => dispatch({ type: "connection_lost" }),
        onReplaced: () => dispatch({ type: "replaced" }),
      },
    );
    connectionRef.current = connection;
    return () => {
      connection.close();
      connectionRef.current = null;
    };
  }, [code, identity]);

  const roll = useCallback(() => connectionRef.current?.send({ type: "roll" }), []);
  return { state, roll };
}

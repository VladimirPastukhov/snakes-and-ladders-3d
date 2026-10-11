import { useEffect, useReducer } from "react";
import type { Identity } from "../identity";
import { connectToMatch, matchSocketUrl } from "./connection";
import { initialMatchState, matchReducer, type MatchState } from "./state";

/** Connects to the Match while `code` is set; returns what the Match screen shows. */
export function useMatch(code: string | null, identity: Identity): MatchState {
  const [state, dispatch] = useReducer(matchReducer, initialMatchState);

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
    return () => connection.close();
  }, [code, identity]);

  return state;
}

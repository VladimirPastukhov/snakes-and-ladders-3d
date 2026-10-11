import { GAME_TITLE, SEATS, type Seat } from "@sl/shared";
import { useMemo, useState } from "react";
import { BoardScene } from "./board/BoardScene";
import type { TokenSpot } from "./board/scenery";
import { Identity } from "./identity";
import { createMatch } from "./match/api";
import { isReconnecting } from "./match/state";
import { useMatch } from "./match/useMatch";
import { matchPath, navigate, useRoute } from "./route";
import { HomePanel } from "./screens/HomePanel";
import { MatchMessage } from "./screens/MatchMessage";
import { MatchPanel } from "./screens/MatchPanel";
import { NamePrompt } from "./screens/NamePrompt";
import { hasWebGL } from "./webgl";

const goHome = () => navigate("/");

function parseTokens(key: string): TokenSpot[] {
  if (!key) return [];
  return key.split(",").map((part) => {
    const [seat, cell] = part.split(":");
    return { seat: seat as Seat, cell: Number(cell) };
  });
}

export function App({ identity: given }: { identity?: Identity } = {}) {
  const [webgl] = useState(hasWebGL);
  const [identity] = useState(() => given ?? new Identity());
  const route = useRoute();
  // The code whose name was just confirmed on this page (home Join or the name prompt).
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const code = route.page === "match" ? route.code : null;
  const needsName =
    code !== null && confirmed !== code && !(identity.name && identity.knowsMatch(code));
  const { state, roll } = useMatch(needsName ? null : code, identity);

  const snapshot = code ? state.match : undefined;
  // A stable key, so the Board only redraws Tokens when a Seat or a position changes.
  const tokensKey = snapshot
    ? SEATS.filter((seat) => snapshot.seats[seat])
        .map((seat) => `${seat}:${snapshot.positions[seat]}`)
        .join()
    : "";
  const tokens = useMemo(() => parseTokens(tokensKey), [tokensKey]);

  async function create(name: string) {
    identity.setName(name);
    const newCode = await createMatch({ token: identity.token, name });
    identity.rememberMatch(newCode);
    navigate(matchPath(newCode));
  }

  function join(name: string, joinCode: string) {
    identity.setName(name);
    const upper = joinCode.toUpperCase();
    setConfirmed(upper);
    navigate(matchPath(upper));
  }

  let panel;
  if (!code) {
    panel = <HomePanel initialName={identity.name} onCreate={create} onJoin={join} />;
  } else if (needsName) {
    panel = (
      <NamePrompt
        code={code}
        initialName={identity.name}
        onContinue={(name) => {
          identity.setName(name);
          setConfirmed(code);
        }}
        onHome={goHome}
      />
    );
  } else if (state.match && state.you && (state.status === "seated" || isReconnecting(state))) {
    panel = (
      <MatchPanel
        match={state.match}
        you={state.you}
        reconnecting={isReconnecting(state)}
        onRoll={roll}
        onHome={goHome}
      />
    );
  } else {
    panel = <MatchMessage status={state.status} onHome={goHome} />;
  }

  return (
    <main className="app">
      {webgl ? (
        <BoardScene tokens={tokens} />
      ) : (
        <p className="no-webgl" role="alert">
          This game needs 3D graphics (WebGL), which this browser has turned off or does not
          support.
        </p>
      )}
      <header className="overlay title">
        <h1>{GAME_TITLE}</h1>
      </header>
      {panel}
      <footer className="overlay version">Version: {__APP_VERSION__}</footer>
    </main>
  );
}

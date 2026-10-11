import { GAME_TITLE, SEATS, type Seat } from "@sl/shared";
import { useMemo, useState } from "react";
import { BoardScene } from "./board/BoardScene";
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

export function App({ identity: given }: { identity?: Identity } = {}) {
  const [webgl] = useState(hasWebGL);
  const [identity] = useState(() => given ?? new Identity());
  const route = useRoute();
  // The code whose name was just confirmed on this page (home Join or the name prompt).
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const code = route.page === "match" ? route.code : null;
  const needsName =
    code !== null && confirmed !== code && !(identity.name && identity.knowsMatch(code));
  const state = useMatch(needsName ? null : code, identity);

  const snapshot = code ? state.match : undefined;
  const takenKey = snapshot ? SEATS.filter((seat) => snapshot.seats[seat]).join() : "";
  const seats = useMemo(() => (takenKey ? (takenKey.split(",") as Seat[]) : []), [takenKey]);

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
    panel = <MatchPanel match={state.match} you={state.you} reconnecting={isReconnecting(state)} />;
  } else {
    panel = <MatchMessage status={state.status} onHome={goHome} />;
  }

  return (
    <main className="app">
      {webgl ? (
        <BoardScene seats={seats} />
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

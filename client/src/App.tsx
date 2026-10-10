import { GAME_TITLE } from "@sl/shared";
import { useState } from "react";
import { BoardScene } from "./board/BoardScene";
import { hasWebGL } from "./webgl";

export function App() {
  const [webgl] = useState(hasWebGL);
  return (
    <main className="app">
      {webgl ? (
        <BoardScene />
      ) : (
        <p className="no-webgl" role="alert">
          This game needs 3D graphics (WebGL), which this browser has turned off or does not
          support.
        </p>
      )}
      <header className="overlay title">
        <h1>{GAME_TITLE}</h1>
      </header>
      <footer className="overlay version">Version: {__APP_VERSION__}</footer>
    </main>
  );
}

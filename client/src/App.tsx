import { GAME_TITLE } from "@sl/shared";

export function App() {
  return (
    <main>
      <h1>{GAME_TITLE}</h1>
      <p>The Yellow Brick Road is being paved. Coming soon.</p>
      <footer>Version: {__APP_VERSION__}</footer>
    </main>
  );
}

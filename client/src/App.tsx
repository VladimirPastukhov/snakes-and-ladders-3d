import { GAME_TITLE } from "@sl/shared";

export function App() {
  return (
    <main>
      <h1>{GAME_TITLE}</h1>
      <p>Coming soon.</p>
      <footer>Version: {__APP_VERSION__}</footer>
    </main>
  );
}

import type { MatchStatus } from "../match/state";

const MESSAGES: Partial<Record<MatchStatus, string>> = {
  full: "This match is full",
  not_found: "Match not found",
  replaced: "This match is open in another tab",
};

/** A Match screen without a Seat: connecting, or one of the dead ends with a way home. */
export function MatchMessage({ status, onHome }: { status: MatchStatus; onHome: () => void }) {
  const message = MESSAGES[status];
  if (!message) {
    return (
      <section className="panel" aria-label="Match">
        <p role="status">Connecting…</p>
      </section>
    );
  }
  return (
    <section className="panel" aria-label="Match">
      <h2 role="alert">{message}</h2>
      <button type="button" className="primary" onClick={onHome}>
        Back to home
      </button>
    </section>
  );
}

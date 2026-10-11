import { SEATS, type MatchSnapshot, type Seat } from "@sl/shared";
import { useRef, useState } from "react";
import { SEAT_LOOK } from "../board/oz";
import { matchPath } from "../route";

export interface MatchPanelProps {
  match: MatchSnapshot;
  you: Seat;
  reconnecting: boolean;
  origin?: string;
}

/** The Match screen: invite link, Match Code, and who sits in each seat. */
export function MatchPanel({
  match,
  you,
  reconnecting,
  origin = window.location.origin,
}: MatchPanelProps) {
  const link = origin + matchPath(match.code);
  const [copied, setCopied] = useState(false);
  const linkField = useRef<HTMLInputElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // No Clipboard API on plain http (e.g. a phone on the local network): copy the selection.
      linkField.current?.select();
      setCopied(document.execCommand("copy"));
    }
  }

  return (
    <section className="panel" aria-label={`Match ${match.code}`}>
      {reconnecting && (
        <p className="status" role="status">
          Reconnecting…
        </p>
      )}
      <p className="code">
        Match Code <strong data-testid="match-code">{match.code}</strong>
      </p>
      <div className="row">
        <input
          ref={linkField}
          readOnly
          value={link}
          aria-label="Invite link"
          onFocus={(e) => e.target.select()}
        />
        <button type="button" onClick={copy}>
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
      <ul className="seats" aria-label="Players">
        {SEATS.map((seat) => {
          const held = match.seats[seat];
          const look = SEAT_LOOK[seat];
          return (
            <li key={seat} data-seat={seat}>
              <span className="swatch" style={{ background: look.color }} aria-hidden />
              <span className="character">{look.character}</span>
              {held ? (
                <>
                  <span className="name">
                    {held.name}
                    {seat === you && " (you)"}
                  </span>
                  <span className={held.connected ? "presence on" : "presence off"}>
                    {held.connected ? "connected" : "disconnected"}
                  </span>
                </>
              ) : (
                <span className="waiting">Waiting for a friend…</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

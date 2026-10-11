import { NAME_MAX_LENGTH } from "@sl/shared";
import { useId, useState, type FormEvent } from "react";
import { checkName } from "../identity";

const CODE_LENGTH = 5;

export interface HomePanelProps {
  initialName: string;
  /** Resolves when the Match is created; rejects to show an error. */
  onCreate: (name: string) => Promise<void>;
  onJoin: (name: string, code: string) => void;
}

/** The home screen: a name, then New Match or Join with a Match Code. */
export function HomePanel({ initialName, onCreate, onJoin }: HomePanelProps) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const nameId = useId();
  const codeId = useId();

  function withName(action: (name: string) => void) {
    const check = checkName(name);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);
    action(check.name);
  }

  function create() {
    withName((valid) => {
      setCreating(true);
      onCreate(valid).catch(() => {
        setCreating(false);
        setError("Couldn't create a match. Please try again.");
      });
    });
  }

  function join(event: FormEvent) {
    event.preventDefault();
    withName((valid) => onJoin(valid, code.trim()));
  }

  return (
    <section className="panel" aria-label="Start playing">
      <label htmlFor={nameId}>Your name</label>
      <input
        id={nameId}
        value={name}
        maxLength={NAME_MAX_LENGTH}
        autoComplete="nickname"
        onChange={(e) => setName(e.target.value)}
        aria-invalid={error === "Please enter a name." || undefined}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="primary" onClick={create} disabled={creating}>
        {creating ? "Creating…" : "New Match"}
      </button>
      <form className="join" onSubmit={join}>
        <label htmlFor={codeId}>Match Code</label>
        <div className="row">
          <input
            id={codeId}
            value={code}
            maxLength={CODE_LENGTH}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="K7QXM"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="submit" disabled={!code.trim()}>
            Join
          </button>
        </div>
      </form>
    </section>
  );
}

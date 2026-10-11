import { NAME_MAX_LENGTH } from "@sl/shared";
import { useId, useState, type FormEvent } from "react";
import { checkName } from "../identity";

/** Asks for a name before joining a Match from its link. */
export function NamePrompt({
  code,
  initialName,
  onContinue,
  onHome,
}: {
  code: string;
  initialName: string;
  onContinue: (name: string) => void;
  onHome: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();

  function submit(event: FormEvent) {
    event.preventDefault();
    const check = checkName(name);
    if (check.ok) onContinue(check.name);
    else setError(check.error);
  }

  return (
    <form className="panel" aria-label={`Join match ${code}`} onSubmit={submit}>
      <h2>Join match {code}</h2>
      <label htmlFor={nameId}>Your name</label>
      <input
        id={nameId}
        value={name}
        maxLength={NAME_MAX_LENGTH}
        autoComplete="nickname"
        autoFocus
        onChange={(e) => setName(e.target.value)}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="primary">
        Join
      </button>
      <button type="button" className="link" onClick={onHome}>
        Back to home
      </button>
    </form>
  );
}

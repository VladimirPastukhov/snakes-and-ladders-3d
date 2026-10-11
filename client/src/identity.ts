import { NAME_MAX_LENGTH } from "@sl/shared";

const NAME_KEY = "sl.name";
const TOKEN_KEY = "sl.token";
const MATCHES_KEY = "sl.matches";
const KNOWN_MATCHES_LIMIT = 20;

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

/** Trims the typed name; a Player's name must be 1 to NAME_MAX_LENGTH characters. */
export function checkName(input: string): NameCheck {
  const name = input.trim();
  if (!name) return { ok: false, error: "Please enter a name." };
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, error: `Use at most ${NAME_MAX_LENGTH} characters.` };
  }
  return { ok: true, name };
}

// crypto.randomUUID only exists on https and localhost; getRandomValues works on a LAN address too.
function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type KeyValue = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): KeyValue | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The display name and session token this browser keeps between visits.
 * Falls back to memory for the page's lifetime when storage is unavailable.
 */
export class Identity {
  private memory = new Map<string, string>();

  constructor(private storage: KeyValue | null = browserStorage()) {}

  private read(key: string): string | null {
    try {
      const value = this.storage?.getItem(key);
      if (value != null) return value;
    } catch {
      // Blocked storage: use memory.
    }
    return this.memory.get(key) ?? null;
  }

  private write(key: string, value: string): void {
    this.memory.set(key, value);
    try {
      this.storage?.setItem(key, value);
    } catch {
      // Blocked or full storage: memory keeps it for this page.
    }
  }

  get name(): string {
    return this.read(NAME_KEY) ?? "";
  }

  setName(name: string): void {
    this.write(NAME_KEY, name);
  }

  /** Random, never shown, never in a URL; created on first use. */
  get token(): string {
    let token = this.read(TOKEN_KEY);
    if (!token) {
      token = randomToken();
      this.write(TOKEN_KEY, token);
    }
    return token;
  }

  /** Matches this browser holds a seat in, so returning to one skips the name prompt. */
  knowsMatch(code: string): boolean {
    return this.knownMatches().includes(code);
  }

  rememberMatch(code: string): void {
    if (this.knowsMatch(code)) return;
    const codes = [code, ...this.knownMatches()].slice(0, KNOWN_MATCHES_LIMIT);
    this.write(MATCHES_KEY, codes.join(","));
  }

  private knownMatches(): string[] {
    return this.read(MATCHES_KEY)?.split(",").filter(Boolean) ?? [];
  }
}

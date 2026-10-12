import type { Seat } from "@sl/shared";

/** A uniformly random whole number in [0, sides), by rejection sampling over random bytes. */
function fairInt(sides: number): number {
  const limit = 256 - (256 % sides); // bytes at or above this would favour low numbers
  const byte = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(byte);
    if (byte[0]! < limit) return byte[0]! % sides;
  }
}

/** One throw of a six-sided die. */
export function rollDie(): number {
  return fairInt(6) + 1;
}

/** The first Current Player, each Seat equally likely. */
export function pickFirst(): Seat {
  return fairInt(2) === 0 ? "creator" : "joiner";
}

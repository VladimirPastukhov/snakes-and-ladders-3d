import type { MatchEvent, MatchSnapshot, Turn } from "@sl/shared";

/** A Turn waiting to be animated, and the snapshot to show once it has been. */
export interface PlaybackTarget {
  turn: Turn;
  snapshot: MatchSnapshot;
  duration: number;
}

/** The Turn being animated now, and when it started (`performance.now()` clock). */
export interface PlayingTurn extends PlaybackTarget {
  startedAt: number;
}

/**
 * What a screen shows, which can lag behind the latest snapshot while a Turn animates.
 * `shown` changes positions, Turn and Winner only when a Turn's animation finishes.
 */
export interface Playback {
  shown?: MatchSnapshot;
  latest?: MatchSnapshot;
  playing: PlayingTurn | null;
  queue: PlaybackTarget[];
}

export type PlaybackAction =
  | {
      type: "snapshot";
      match: MatchSnapshot | undefined;
      arrival: "welcome" | MatchEvent | undefined;
      /** Apply at once with no animation (reduced motion or a hidden page). */
      instant: boolean;
      duration: (turn: Turn) => number;
      now: number;
    }
  | { type: "finish"; now: number }
  | { type: "flush" };

export const initialPlayback: Playback = { playing: null, queue: [] };

/** Seats and presence always come from the latest snapshot; they never wait for a Turn. */
function withSeatsOf(snapshot: MatchSnapshot, latest: MatchSnapshot | undefined): MatchSnapshot {
  if (!latest || snapshot.seats === latest.seats) return snapshot;
  return { ...snapshot, seats: latest.seats };
}

function startNext(state: Playback, now: number): Playback {
  const [next, ...rest] = state.queue;
  if (!next) return { ...state, playing: null };
  return { ...state, playing: { ...next, startedAt: now }, queue: rest };
}

export function playbackReducer(state: Playback, action: PlaybackAction): Playback {
  switch (action.type) {
    case "snapshot": {
      const { match, arrival, instant, duration, now } = action;
      if (!match) return initialPlayback;
      const busy = state.playing !== null || state.queue.length > 0;
      const turn = match.lastTurn;
      // A Turn is only animated when it arrives live; a welcome (load or reconnect) shows it as it is.
      if (arrival === "rolled" && turn && !instant) {
        const queued: Playback = {
          ...state,
          latest: match,
          shown: state.shown && withSeatsOf(state.shown, match),
          queue: [...state.queue, { turn, snapshot: match, duration: duration(turn) }],
        };
        return busy ? queued : startNext(queued, now);
      }
      if (arrival === "welcome" || instant || !busy) {
        return { shown: match, latest: match, playing: null, queue: [] };
      }
      // Presence or a rename while a Turn plays: show the seats now, the rest after the Turn.
      return { ...state, latest: match, shown: state.shown && withSeatsOf(state.shown, match) };
    }
    case "finish": {
      if (!state.playing) return state;
      const revealed = { ...state, shown: withSeatsOf(state.playing.snapshot, state.latest) };
      return startNext(revealed, action.now);
    }
    case "flush": {
      if (!state.playing && state.queue.length === 0) return state;
      return { ...state, shown: state.latest, playing: null, queue: [] };
    }
  }
}

/** True while a Turn is animating or waiting to. */
export function isBusy(state: Playback): boolean {
  return state.playing !== null || state.queue.length > 0;
}

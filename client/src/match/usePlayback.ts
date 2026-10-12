import { useEffect, useReducer } from "react";
import { turnDuration } from "../board/turnMotion";
import { prefersReducedMotion } from "../motion";
import { initialPlayback, isBusy, playbackReducer, type PlayingTurn } from "./playback";
import type { MatchState } from "./state";
import type { MatchSnapshot } from "@sl/shared";

const pageHidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

/**
 * What the screen shows of the Match: `shown` lags the latest snapshot while a Turn animates,
 * and `playing` is the Turn being animated. The animation's end is timed here, not by the Board,
 * so the panel is revealed on time even without WebGL or in a slow browser.
 */
export function usePlayback({ match, arrival }: MatchState): {
  shown?: MatchSnapshot;
  playing: PlayingTurn | null;
  busy: boolean;
} {
  const [state, dispatch] = useReducer(playbackReducer, initialPlayback);

  useEffect(() => {
    dispatch({
      type: "snapshot",
      match,
      arrival,
      instant: prefersReducedMotion() || pageHidden(),
      duration: turnDuration,
      now: performance.now(),
    });
  }, [match, arrival]);

  const { playing } = state;
  useEffect(() => {
    if (!playing) return;
    const left = playing.startedAt + playing.duration - performance.now();
    const timer = setTimeout(() => dispatch({ type: "finish", now: performance.now() }), left);
    return () => clearTimeout(timer);
  }, [playing]);

  // Timers and frames stall in a hidden tab: finish everything at once instead.
  useEffect(() => {
    const onVisibility = () => {
      if (pageHidden()) dispatch({ type: "flush" });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // A rolled snapshot not yet taken in (its effect runs after this render) is about to animate.
  const arriving = arrival === "rolled" && match !== undefined && match !== state.latest;
  return { shown: state.shown, playing, busy: isBusy(state) || arriving };
}

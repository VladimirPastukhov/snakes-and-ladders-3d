import { useFrame, useThree } from "@react-three/fiber";
import type { Seat, Turn } from "@sl/shared";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { Group, Vector3 } from "three";
import type { PlayingTurn } from "../match/playback";
import type { JumpArc } from "./arcs";
import { Die } from "./Die";
import { SEAT_LOOK } from "./oz";
import type { Road } from "./road";
import { Pawn } from "./scenery";
import { buildTimeline, dieAt, dieFacing, dieRest, tokenAt } from "./turnMotion";

/**
 * Where the animation is right now, shared with the camera rig and the debug hook. It changes
 * every frame, so it lives outside React state.
 */
export interface LiveMotion {
  mover: Seat | null;
  /** Last Cell the moving Token has reached. */
  cell: number | null;
  token: Vector3 | null;
  die: Vector3 | null;
  following: boolean;
  /** Camera distance of the view that frames the whole Board in the current window. */
  overviewDistance: number | null;
}

export function createLiveMotion(): LiveMotion {
  return {
    mover: null,
    cell: null,
    token: null,
    die: null,
    following: false,
    overviewDistance: null,
  };
}

/**
 * Draws the playing Turn (die tumble, hops, Jump flight) from the time since it started, and the
 * die at rest beside the last Turn's starting Cell otherwise.
 */
export function TurnPlayer({
  road,
  arcs,
  playing,
  lastTurn,
  liveRef,
}: {
  road: Road;
  arcs: readonly JumpArc[];
  playing: PlayingTurn | null;
  lastTurn: Turn | null;
  liveRef: RefObject<LiveMotion>;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const pawn = useRef<Group>(null);
  const die = useRef<Group>(null);
  const timeline = useMemo(
    () => (playing ? buildTimeline(playing.turn, road, arcs) : null),
    [playing, road, arcs],
  );
  const resting = useMemo(() => {
    if (!lastTurn) return null;
    return { position: dieRest(road, lastTurn), quaternion: dieFacing(lastTurn.roll) };
  }, [lastTurn, road]);

  useEffect(() => {
    if (!playing) {
      liveRef.current.mover = null;
      liveRef.current.cell = null;
      liveRef.current.token = null;
      liveRef.current.die = resting?.position ?? null;
    }
    invalidate();
  }, [playing, resting, liveRef, invalidate]);

  useFrame(() => {
    if (!timeline || !playing) return;
    const t = performance.now() - playing.startedAt;
    const token = tokenAt(timeline, t);
    const pose = dieAt(timeline, t);
    pawn.current?.position.copy(token.position);
    die.current?.position.copy(pose.position);
    die.current?.quaternion.copy(pose.quaternion);
    liveRef.current.mover = playing.turn.seat;
    liveRef.current.cell = token.cell;
    liveRef.current.token = token.position;
    liveRef.current.die = pose.position;
    // The frameloop is on demand: keep drawing until the Turn's last pose is on screen.
    if (t < timeline.duration) invalidate();
  });

  const showDie = playing ?? resting;
  return (
    <group>
      {playing && (
        <group ref={pawn}>
          <Pawn color={SEAT_LOOK[playing.turn.seat].color} />
        </group>
      )}
      {showDie && (
        <group
          ref={die}
          position={playing ? undefined : resting!.position}
          quaternion={playing ? undefined : resting!.quaternion}
        >
          <Die />
        </group>
      )}
    </group>
  );
}

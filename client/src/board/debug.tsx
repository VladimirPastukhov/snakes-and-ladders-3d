import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, type RefObject } from "react";
import { Spherical, Vector3 } from "three";
import { arcTop, type JumpArc } from "./arcs";
import type { Road } from "./road";
import type { PlayingTurn } from "../match/playback";
import type { TokenSpot } from "./scenery";
import type { LiveMotion } from "./TurnPlayer";
import { TUMBLE_MS } from "./turnMotion";

/** Snapshot of the scene for browser automation; only exists in development builds. */
export interface BoardDebug {
  viewport: { width: number; height: number };
  /** `overviewDistance` is where the camera sits when it frames the whole Board. */
  camera: {
    distance: number;
    overviewDistance: number | null;
    polarDegrees: number;
    azimuthDegrees: number;
  };
  cells: { cell: number; x: number; y: number; onScreen: boolean }[];
  arcs: { from: number; to: number; kind: string; x: number; y: number }[];
  /** The drawn Tokens and where they stand (0 = Start); a moving Token reports its last Cell reached. */
  tokens: TokenSpot[];
  /** True while a Turn is being animated. */
  animating: boolean;
  /** The die on screen: the value it shows (once resting) and where; null before the first Roll. */
  die: { value: number; resting: boolean; x: number; y: number } | null;
  /** True while the camera follows the moving Token. */
  following: boolean;
}

declare global {
  interface Window {
    __board?: BoardDebug;
  }
}

/** Publishes `window.__board` after every rendered frame. Mounted only when `import.meta.env.DEV`. */
export function DebugHook({
  road,
  arcs,
  tokens,
  playing,
  lastRoll,
  liveRef,
}: {
  road: Road;
  arcs: JumpArc[];
  tokens: readonly TokenSpot[];
  playing: PlayingTurn | null;
  lastRoll: number | null;
  liveRef: RefObject<LiveMotion>;
}) {
  const controls = useThree((state) => state.controls) as { target?: Vector3 } | null;
  const invalidate = useThree((state) => state.invalidate);
  // The frameloop is on demand: draw a frame when the Tokens change so the hook updates.
  useEffect(() => invalidate(), [tokens, playing, invalidate]);
  useFrame(({ camera, size }) => {
    const toScreen = (world: Vector3) => {
      const ndc = world.clone().project(camera);
      return {
        x: ((ndc.x + 1) / 2) * size.width,
        y: ((1 - ndc.y) / 2) * size.height,
        inFront: ndc.z < 1,
      };
    };
    const dieInfo = () => {
      if (!liveRef.current.die) return null;
      const p = toScreen(liveRef.current.die);
      const resting = playing === null || performance.now() - playing.startedAt >= TUMBLE_MS;
      const value = playing?.turn.roll ?? lastRoll;
      return value === null ? null : { value, resting, x: p.x, y: p.y };
    };
    const target = controls?.target ?? new Vector3();
    const view = new Spherical().setFromVector3(camera.position.clone().sub(target));
    window.__board = {
      viewport: { width: size.width, height: size.height },
      camera: {
        distance: view.radius,
        overviewDistance: liveRef.current.overviewDistance,
        polarDegrees: (view.phi * 180) / Math.PI,
        azimuthDegrees: (view.theta * 180) / Math.PI,
      },
      cells: road.cells.map(({ position }, i) => {
        const p = toScreen(position);
        const onScreen =
          p.inFront && p.x >= 0 && p.x <= size.width && p.y >= 0 && p.y <= size.height;
        return { cell: i + 1, x: p.x, y: p.y, onScreen };
      }),
      arcs: arcs.map((arc) => {
        const p = toScreen(arcTop(arc));
        const { kind, from, to } = arc.jump;
        return { from, to, kind, x: p.x, y: p.y };
      }),
      tokens: tokens.map((t) =>
        t.seat === liveRef.current.mover && liveRef.current.cell !== null
          ? { ...t, cell: liveRef.current.cell }
          : { ...t },
      ),
      animating: playing !== null,
      die: dieInfo(),
      following: liveRef.current.following,
    };
  });
  return null;
}

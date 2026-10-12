import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from "react";
import type { Turn } from "@sl/shared";
import { Spherical, Vector3 } from "three";
import type { PlayingTurn } from "../match/playback";
import { buildArcs, type JumpArc } from "./arcs";
import { prefersReducedMotion } from "../motion";
import {
  CAMERA_FOV,
  ORBIT_LIMITS,
  fitCamera,
  followGoal,
  hasArrived,
  nextFollowMode,
  stepToward,
  type CameraGoal,
  type FollowEvent,
  type FollowMode,
} from "./camera";
import { DebugHook } from "./debug";
import { JumpArcs } from "./JumpArcs";
import { buildRoad, type Road } from "./road";
import { Cells, Ground, Landmarks, Path, Tokens, type TokenSpot } from "./scenery";
import { TurnPlayer, createLiveMotion, type LiveMotion } from "./TurnPlayer";

/**
 * Frames the whole Board for the current window, and again whenever it is resized. While a Turn
 * plays, it glides closer to follow the moving Token, then glides back, unless the Player takes
 * the camera by dragging or zooming.
 */
function CameraRig({
  road,
  playing,
  liveRef,
}: {
  road: Road;
  playing: PlayingTurn | null;
  liveRef: RefObject<LiveMotion>;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const invalidate = useThree((state) => state.invalidate);
  // Frame the road plus everything around its ends (farmhouse, Tokens, city), so nothing is cut off.
  const points = useMemo(() => {
    const around = (centre: Vector3, reach: number, height: number) =>
      [-reach, reach].flatMap((dx) =>
        [-reach, reach].flatMap((dz) =>
          [0, height].map((y) => new Vector3(centre.x + dx, y, centre.z + dz)),
        ),
      );
    return [
      ...[road.start, ...road.cells, road.city].map((p) => p.position),
      ...around(road.farmhouse, 0.75, 1.2),
      ...around(road.start.position, road.cellSize * 0.6, 0.7),
      ...around(road.city.position, 0.8, 1.6),
    ];
  }, [road]);

  const overview = useRef<CameraGoal | null>(null);
  const mode = useRef<FollowMode>("idle");
  const send = useCallback(
    (event: FollowEvent) => {
      mode.current = nextFollowMode(mode.current, event, prefersReducedMotion());
      liveRef.current.following = mode.current === "follow";
      invalidate();
    },
    [liveRef, invalidate],
  );
  useEffect(() => send(playing ? "turn_started" : "turn_ended"), [playing, send]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (mode.current === "idle" || !orbit || !overview.current) return;
    const offset = new Spherical().setFromVector3(camera.position.clone().sub(orbit.target));
    const followed = [liveRef.current.token, liveRef.current.die].filter(
      (p): p is Vector3 => p !== null,
    );
    const goal =
      mode.current === "follow"
        ? followGoal(overview.current, followed, {
            aspect,
            polar: offset.phi,
            azimuth: offset.theta,
          })
        : overview.current;
    const current = { target: orbit.target.clone(), distance: offset.radius };
    // A long frame (tab switch) jumps at most a tenth of a second ahead.
    const next = hasArrived(current, goal) ? goal : stepToward(current, goal, Math.min(delta, 0.1));
    orbit.target.copy(next.target);
    offset.radius = next.distance;
    camera.position.setFromSpherical(offset).add(next.target);
    orbit.update();
    if (mode.current === "return" && hasArrived(next, goal)) send("arrived");
    else invalidate();
  });

  useLayoutEffect(() => {
    const fit = fitCamera(points, { aspect });
    overview.current = { target: fit.target.clone(), distance: fit.distance };
    liveRef.current.overviewDistance = fit.distance;
    camera.position.copy(fit.camera.position);
    camera.lookAt(fit.target);
    const orbit = controls.current;
    if (orbit) {
      orbit.target.copy(fit.target);
      orbit.minDistance = fit.distance * ORBIT_LIMITS.minZoom;
      orbit.maxDistance = fit.distance * ORBIT_LIMITS.maxZoom;
      orbit.update();
    }
    invalidate();
  }, [aspect, camera, points, invalidate, liveRef]);

  return (
    <OrbitControls
      ref={controls}
      onStart={() => send("player_moved")}
      makeDefault
      enablePan={false}
      enableDamping={false}
      minPolarAngle={ORBIT_LIMITS.minPolar}
      maxPolarAngle={ORBIT_LIMITS.maxPolar}
      minAzimuthAngle={ORBIT_LIMITS.minAzimuth}
      maxAzimuthAngle={ORBIT_LIMITS.maxAzimuth}
    />
  );
}

/** Reports once that a frame with the whole Board has been drawn. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const invalidate = useThree((state) => state.invalidate);
  const done = useRef(false);
  useEffect(() => invalidate(), [invalidate]);
  useFrame(() => {
    if (!done.current) {
      done.current = true;
      // Wait one more tick so the frame being rendered now is on screen.
      requestAnimationFrame(onReady);
    }
  });
  return null;
}

export interface BoardSceneProps {
  /** Where the Tokens stand when no Turn moves them. */
  tokens: readonly TokenSpot[];
  /** The Turn being animated, if any. */
  playing?: PlayingTurn | null;
  /** The last Turn shown, so the die can rest showing its Roll. */
  lastTurn?: Turn | null;
}

/** The Board, with the given Tokens on their Cells and the playing Turn animated. */
export function BoardScene({ tokens, playing = null, lastTurn = null }: BoardSceneProps) {
  const road = useMemo(() => buildRoad(), []);
  const arcs: JumpArc[] = useMemo(() => buildArcs(road), [road]);
  const liveRef = useRef<LiveMotion>(createLiveMotion());
  const [ready, setReady] = useState(false);

  return (
    <div className="board" data-board-ready={ready ? "true" : undefined}>
      <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: CAMERA_FOV, near: 0.1, far: 500 }}>
        <color attach="background" args={["#bfe3f2"]} />
        <hemisphereLight args={["#ffffff", "#556b4e", 1.6]} />
        <directionalLight position={[4, 10, 6]} intensity={1.4} />
        <CameraRig road={road} playing={playing} liveRef={liveRef} />
        <Ground road={road} />
        <Path road={road} />
        <Landmarks road={road} />
        <Tokens road={road} tokens={tokens} moving={playing?.turn.seat} />
        <TurnPlayer
          road={road}
          arcs={arcs}
          playing={playing}
          lastTurn={lastTurn}
          liveRef={liveRef}
        />
        <JumpArcs road={road} arcs={arcs} />
        <Suspense fallback={null}>
          <Cells road={road} />
          <ReadySignal onReady={() => setReady(true)} />
        </Suspense>
        {import.meta.env.DEV && (
          <DebugHook
            road={road}
            arcs={arcs}
            tokens={tokens}
            playing={playing}
            lastRoll={lastTurn?.roll ?? null}
            liveRef={liveRef}
          />
        )}
      </Canvas>
    </div>
  );
}

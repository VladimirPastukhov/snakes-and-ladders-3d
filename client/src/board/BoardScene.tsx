import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import { Vector3 } from "three";
import { buildArcs, type JumpArc } from "./arcs";
import { CAMERA_FOV, ORBIT_LIMITS, fitCamera } from "./camera";
import { DebugHook } from "./debug";
import { JumpArcs } from "./JumpArcs";
import { buildRoad, type Road } from "./road";
import { Cells, Ground, Landmarks, Path, Tokens } from "./scenery";

/** Frames the whole Board for the current window, and again whenever it is resized. */
function CameraRig({ road }: { road: Road }) {
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

  useLayoutEffect(() => {
    const fit = fitCamera(points, { aspect });
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
  }, [aspect, camera, points, invalidate]);

  return (
    <OrbitControls
      ref={controls}
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

export function BoardScene() {
  const road = useMemo(() => buildRoad(), []);
  const arcs: JumpArc[] = useMemo(() => buildArcs(road), [road]);
  const [selected, setSelected] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  return (
    <div className="board" data-board-ready={ready ? "true" : undefined}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: CAMERA_FOV, near: 0.1, far: 500 }}
        onPointerMissed={() => setSelected(null)}
      >
        <color attach="background" args={["#bfe3f2"]} />
        <hemisphereLight args={["#ffffff", "#556b4e", 1.6]} />
        <directionalLight position={[4, 10, 6]} intensity={1.4} />
        <CameraRig road={road} />
        <Ground road={road} />
        <Path road={road} />
        <Landmarks road={road} />
        <Tokens road={road} />
        <JumpArcs arcs={arcs} selected={selected} onSelect={setSelected} />
        <Suspense fallback={null}>
          <Cells road={road} />
          <ReadySignal onReady={() => setReady(true)} />
        </Suspense>
        {import.meta.env.DEV && <DebugHook road={road} arcs={arcs} selected={selected} />}
      </Canvas>
    </div>
  );
}

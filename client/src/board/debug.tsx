import { useFrame, useThree } from "@react-three/fiber";
import { Spherical, Vector3 } from "three";
import { arcTop, type JumpArc } from "./arcs";
import type { Road } from "./road";

/** Snapshot of the scene for browser automation; only exists in development builds. */
export interface BoardDebug {
  viewport: { width: number; height: number };
  camera: { distance: number; polarDegrees: number; azimuthDegrees: number };
  cells: { cell: number; x: number; y: number; onScreen: boolean }[];
  arcs: { from: number; to: number; kind: string; x: number; y: number }[];
}

declare global {
  interface Window {
    __board?: BoardDebug;
  }
}

/** Publishes `window.__board` after every rendered frame. Mounted only when `import.meta.env.DEV`. */
export function DebugHook({ road, arcs }: { road: Road; arcs: JumpArc[] }) {
  const controls = useThree((state) => state.controls) as { target?: Vector3 } | null;
  useFrame(({ camera, size }) => {
    const toScreen = (world: Vector3) => {
      const ndc = world.clone().project(camera);
      return {
        x: ((ndc.x + 1) / 2) * size.width,
        y: ((1 - ndc.y) / 2) * size.height,
        inFront: ndc.z < 1,
      };
    };
    const target = controls?.target ?? new Vector3();
    const view = new Spherical().setFromVector3(camera.position.clone().sub(target));
    window.__board = {
      viewport: { width: size.width, height: size.height },
      camera: {
        distance: view.radius,
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
    };
  });
  return null;
}

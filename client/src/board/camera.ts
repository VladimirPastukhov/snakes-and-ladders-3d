import { PerspectiveCamera, Spherical, Vector3 } from "three";

export const CAMERA_FOV = 40;

/** Default view: tilted this far from straight down, looking at the Board's far end. */
export const DEFAULT_POLAR = (35 * Math.PI) / 180;
export const DEFAULT_AZIMUTH = 0;

/** Orbit limits: never flatter than 25° above the ground, never more than 35° to either side. */
export const ORBIT_LIMITS = {
  minPolar: (5 * Math.PI) / 180,
  maxPolar: (65 * Math.PI) / 180,
  minAzimuth: (-35 * Math.PI) / 180,
  maxAzimuth: (35 * Math.PI) / 180,
  minZoom: 0.5,
  maxZoom: 1.3,
} as const;

/** Share of the screen edge kept free around the Board, in normalised device coordinates. */
const MARGIN = 0.06;

export interface View {
  aspect: number;
  polar?: number;
  azimuth?: number;
}

/** Camera position for looking at `target` from `distance` away at the given angles. */
export function cameraPosition(target: Vector3, distance: number, polar: number, azimuth: number) {
  return new Vector3().setFromSpherical(new Spherical(distance, polar, azimuth)).add(target);
}

export function centreOf(points: readonly Vector3[]): Vector3 {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const p of points) {
    min.min(p);
    max.max(p);
  }
  return min.add(max).multiplyScalar(0.5);
}

function allVisible(camera: PerspectiveCamera, points: readonly Vector3[]): boolean {
  const limit = 1 - MARGIN;
  return points.every((p) => {
    const ndc = p.clone().project(camera);
    return Math.abs(ndc.x) <= limit && Math.abs(ndc.y) <= limit && ndc.z < 1;
  });
}

/** A camera placed to show every point, as close as possible. */
export function fitCamera(
  points: readonly Vector3[],
  { aspect, polar = DEFAULT_POLAR, azimuth = DEFAULT_AZIMUTH }: View,
): { camera: PerspectiveCamera; target: Vector3; distance: number } {
  const target = centreOf(points);
  const camera = new PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 500);
  const place = (distance: number) => {
    camera.position.copy(cameraPosition(target, distance, polar, azimuth));
    camera.lookAt(target);
    camera.updateMatrixWorld();
  };
  let near = 1;
  let far = 400;
  for (let i = 0; i < 40; i++) {
    const mid = (near + far) / 2;
    place(mid);
    if (allVisible(camera, points)) far = mid;
    else near = mid;
  }
  place(far);
  return { camera, target, distance: far };
}

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

/** While following a Turn, the camera sits this share of the overview distance from its target. */
export const FOLLOW_ZOOM = 0.55;
/** How quickly the follow camera closes the gap to its goal, per second (exponential damping). */
export const FOLLOW_RATE = 6;

/**
 * Follow camera: `follow` while a Turn plays, `return` while gliding back to the overview,
 * `idle` otherwise. Once the Player drags or zooms, the camera is theirs until the next Turn.
 */
export type FollowMode = "idle" | "follow" | "return";
export type FollowEvent = "turn_started" | "turn_ended" | "player_moved" | "arrived";

export function nextFollowMode(mode: FollowMode, event: FollowEvent, reducedMotion: boolean) {
  switch (event) {
    case "turn_started":
      return reducedMotion ? "idle" : "follow";
    case "turn_ended":
      return mode === "follow" ? "return" : mode;
    case "player_moved":
      return "idle";
    case "arrived":
      return mode === "return" ? "idle" : mode;
  }
}

export interface CameraGoal {
  target: Vector3;
  distance: number;
}

/** Room kept around each followed object, so a whole Token or die stays on screen. */
const FOLLOW_PADDING = 1;
const FOLLOW_HEIGHT = 0.8;

/**
 * Where the camera aims while following: framing the moving Token and the die from the current
 * angles, never closer than `FOLLOW_ZOOM` of the overview and never further than the overview.
 */
export function followGoal(
  overview: CameraGoal,
  followed: readonly Vector3[],
  view: Required<View>,
): CameraGoal {
  if (followed.length === 0) return overview;
  const points = followed.flatMap((p) =>
    [-FOLLOW_PADDING, FOLLOW_PADDING].flatMap((dx) =>
      [-FOLLOW_PADDING, FOLLOW_PADDING].flatMap((dz) =>
        [0, FOLLOW_HEIGHT].map((dy) => new Vector3(p.x + dx, p.y + dy, p.z + dz)),
      ),
    ),
  );
  const fit = fitCamera(points, view);
  const distance = Math.min(
    overview.distance,
    Math.max(overview.distance * FOLLOW_ZOOM, fit.distance),
  );
  return { target: fit.target, distance };
}

/** One damped step from `current` towards `goal`, `dt` seconds later; never overshoots. */
export function stepToward(current: CameraGoal, goal: CameraGoal, dt: number): CameraGoal {
  const k = 1 - Math.exp(-FOLLOW_RATE * dt);
  return {
    target: current.target.clone().lerp(goal.target, k),
    distance: current.distance + (goal.distance - current.distance) * k,
  };
}

/** True once `current` is close enough to `goal` to snap onto it. */
export function hasArrived(current: CameraGoal, goal: CameraGoal): boolean {
  return (
    current.target.distanceTo(goal.target) < 0.01 &&
    Math.abs(current.distance - goal.distance) < 0.01
  );
}

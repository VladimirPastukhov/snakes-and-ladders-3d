import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  CAMERA_FOV,
  DEFAULT_POLAR,
  FOLLOW_ZOOM,
  cameraPosition,
  fitCamera,
  followGoal,
  hasArrived,
  nextFollowMode,
  stepToward,
} from "./camera";
import { buildRoad } from "./road";

const road = buildRoad();
const points = [road.start, ...road.cells, road.city].map((p) => p.position);

function onScreen(camera: ReturnType<typeof fitCamera>["camera"], p: Vector3) {
  const ndc = p.clone().project(camera);
  return Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1;
}

describe("fitCamera", () => {
  for (const [width, height] of [
    [390, 844],
    [1440, 900],
  ] as const) {
    it(`shows every Cell at ${width} × ${height}`, () => {
      const { camera } = fitCamera(points, { aspect: width / height });
      for (const [i, cell] of road.cells.entries()) {
        expect(onScreen(camera, cell.position), `Cell ${i + 1}`).toBe(true);
      }
    });
  }

  it("moves closer for a wide window than for a narrow one", () => {
    const portrait = fitCamera(points, { aspect: 390 / 844 }).distance;
    const landscape = fitCamera(points, { aspect: 1440 / 900 }).distance;
    expect(landscape).toBeLessThan(portrait);
  });

  it("stays above the ground", () => {
    const { camera } = fitCamera(points, { aspect: 390 / 844 });
    expect(camera.position.y).toBeGreaterThan(0);
  });
});

describe("follow camera", () => {
  const overview = fitCamera(points, { aspect: 390 / 844 });

  it("follows a Turn, returns after it, and stops once the Player moves the camera", () => {
    expect(nextFollowMode("idle", "turn_started", false)).toBe("follow");
    expect(nextFollowMode("follow", "turn_ended", false)).toBe("return");
    expect(nextFollowMode("return", "arrived", false)).toBe("idle");
    // The Player takes the camera: no return when the Turn ends.
    expect(nextFollowMode("follow", "player_moved", false)).toBe("idle");
    expect(nextFollowMode("idle", "turn_ended", false)).toBe("idle");
    // The next Turn follows again.
    expect(nextFollowMode("idle", "turn_started", false)).toBe("follow");
  });

  it("never follows with reduced motion", () => {
    expect(nextFollowMode("idle", "turn_started", true)).toBe("idle");
  });

  const view = { aspect: 390 / 844, polar: DEFAULT_POLAR, azimuth: 0 };

  it("closes in on a Token and die that are near each other", () => {
    const token = road.cells[4]!.position;
    const die = road.cells[3]!.position;
    const goal = followGoal(overview, [token, die], view);
    expect(goal.distance).toBeCloseTo(overview.distance * FOLLOW_ZOOM);
    expect(goal.target.distanceTo(token.clone().lerp(die, 0.5))).toBeLessThan(0.5);
  });

  it("pulls back just enough to keep a far-apart Token and die on screen", () => {
    const token = road.cells[6]!.position;
    const die = road.start.position;
    const goal = followGoal(overview, [token, die], view);
    expect(goal.distance).toBeGreaterThan(overview.distance * FOLLOW_ZOOM);
    expect(goal.distance).toBeLessThanOrEqual(overview.distance);
    const camera = new PerspectiveCamera(CAMERA_FOV, view.aspect, 0.1, 500);
    camera.position.copy(cameraPosition(goal.target, goal.distance, view.polar, view.azimuth));
    camera.lookAt(goal.target);
    camera.updateMatrixWorld();
    expect(onScreen(camera, token)).toBe(true);
    expect(onScreen(camera, die)).toBe(true);
  });

  it("keeps the overview when there is nothing to follow", () => {
    expect(followGoal(overview, [], view)).toBe(overview);
  });

  it("eases towards the goal without overshooting, and arrives", () => {
    const goal = { target: new Vector3(10, 0, 0), distance: 15 };
    let current = { target: new Vector3(), distance: 30 };
    let previous = Infinity;
    for (let frame = 0; frame < 300; frame++) {
      current = stepToward(current, goal, 1 / 60);
      const gap = current.target.distanceTo(goal.target);
      expect(gap).toBeLessThan(previous);
      expect(current.target.x).toBeLessThanOrEqual(10);
      previous = gap;
    }
    expect(hasArrived(current, goal)).toBe(true);
    expect(hasArrived({ target: new Vector3(), distance: 30 }, goal)).toBe(false);
  });
});

import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { fitCamera } from "./camera";
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

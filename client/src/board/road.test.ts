import { CELL_COUNT } from "@sl/shared";
import { describe, expect, it } from "vitest";
import { ROAD_BOUNDS, buildRoad } from "./road";

const road = buildRoad();

describe("road", () => {
  it("has Start, 30 Cells and the Emerald City", () => {
    expect(road.cells).toHaveLength(CELL_COUNT);
  });

  it("spaces consecutive Cells evenly", () => {
    const points = [road.start, ...road.cells, road.city].map((p) => p.position);
    for (let i = 1; i < points.length; i++) {
      const gap = points[i]!.distanceTo(points[i - 1]!);
      expect(gap, `step ${i}`).toBeGreaterThan(road.spacing * 0.85);
      expect(gap, `step ${i}`).toBeLessThanOrEqual(road.spacing * 1.01);
    }
  });

  it("never lets two Cell slabs overlap", () => {
    const points = road.cells.map((c) => c.position);
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        expect(points[i]!.distanceTo(points[j]!), `Cells ${i + 1} and ${j + 1}`).toBeGreaterThan(
          road.cellSize * 1.05,
        );
      }
    }
  });

  it("keeps clear of itself where it turns back", () => {
    const points = road.cells.map((c) => c.position);
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 2; j < points.length; j++) {
        expect(points[i]!.distanceTo(points[j]!), `Cells ${i + 1} and ${j + 1}`).toBeGreaterThan(
          road.cellSize * 1.8,
        );
      }
    }
  });

  it("fits the tall target rectangle and runs from near to far", () => {
    for (const { position } of [road.start, ...road.cells, road.city]) {
      expect(position.x).toBeGreaterThanOrEqual(ROAD_BOUNDS.minX);
      expect(position.x).toBeLessThanOrEqual(ROAD_BOUNDS.maxX);
      expect(position.z).toBeGreaterThanOrEqual(ROAD_BOUNDS.minZ);
      expect(position.z).toBeLessThanOrEqual(ROAD_BOUNDS.maxZ);
      expect(position.y).toBe(0);
    }
    expect(road.start.position.z).toBeGreaterThan(road.city.position.z);
  });
});

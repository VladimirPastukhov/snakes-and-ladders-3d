import { describe, expect, it } from "vitest";
import { arrowheads, buildArcs } from "./arcs";
import { buildRoad } from "./road";

const road = buildRoad();
const arcs = buildArcs(road);

describe("arrowheads", () => {
  it.each(arcs.map((arc) => [`${arc.jump.from} → ${arc.jump.to}`, arc] as const))(
    "point along the arc %s towards its destination, evenly spaced, clear of both Cells",
    (_, arc) => {
      const heads = arrowheads(arc);
      expect(heads.length).toBeGreaterThanOrEqual(1);
      const from = arc.curve.getPoint(0);
      const to = arc.curve.getPoint(1);
      for (const head of heads) {
        // Moving a little along the arrow gets closer to the destination.
        const ahead = head.position.clone().addScaledVector(head.direction, 0.05);
        expect(ahead.distanceTo(to)).toBeLessThan(head.position.distanceTo(to));
        expect(head.direction.length()).toBeCloseTo(1);
        expect(head.position.distanceTo(from)).toBeGreaterThan(road.cellSize / 2);
        expect(head.position.distanceTo(to)).toBeGreaterThan(road.cellSize / 2);
      }
      const gaps = heads.slice(1).map((h, i) => h.position.distanceTo(heads[i]!.position));
      for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0]!, 0);
    },
  );
});

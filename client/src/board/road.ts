import { CatmullRomCurve3, Vector3 } from "three";
import { CELL_COUNT } from "@sl/shared";

/** A point on the road and the direction the road runs there (unit vector, y = 0). */
export interface RoadPoint {
  position: Vector3;
  tangent: Vector3;
}

export interface Road {
  /** Where Tokens wait before Cell 1. */
  start: RoadPoint;
  /** Cells 1–30; `cells[i]` is Cell i + 1. */
  cells: RoadPoint[];
  /** Where the Emerald City stands, one step past the Final Cell. */
  city: RoadPoint;
  /** Where Dorothy's farmhouse stands, just before Start. */
  farmhouse: Vector3;
  /** Diameter of a (round) Cell slab, in world units. */
  cellSize: number;
  /** Distance between consecutive Cell centres along the road. */
  spacing: number;
}

/**
 * The rectangle the road must stay inside (x across, z from far to near).
 * Tall, to suit a phone in portrait. The road starts near the viewer (+z).
 */
export const ROAD_BOUNDS = { minX: -5.5, maxX: 5.5, minZ: -9, maxZ: 9 } as const;

// Five passes across the board, joined by turns, climbing from near (+z) to far (−z).
const CONTROL_POINTS: readonly [number, number][] = [
  [-4.2, 8.2],
  [0, 7.6],
  [4.2, 7.0],
  [4.9, 5.3],
  [3.6, 3.7],
  [0, 3.9],
  [-3.6, 3.3],
  [-4.9, 1.6],
  [-3.6, 0],
  [0, 0.3],
  [3.6, -0.2],
  [4.9, -1.9],
  [3.6, -3.5],
  [0, -3.2],
  [-3.6, -3.8],
  [-4.9, -5.5],
  [-3.4, -7.1],
  [0, -7.4],
  [2.8, -7.9],
];

/** Fraction of the spacing between Cell centres that a slab covers. */
const CELL_FILL = 0.82;

export function buildRoad(): Road {
  const curve = new CatmullRomCurve3(
    CONTROL_POINTS.map(([x, z]) => new Vector3(x, 0, z)),
    false,
    "centripetal",
  );
  // Start, 30 Cells, then the Emerald City: CELL_COUNT + 1 equal steps.
  const steps = CELL_COUNT + 1;
  const points: RoadPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    points.push({ position: curve.getPointAt(u), tangent: curve.getTangentAt(u).normalize() });
  }
  const spacing = curve.getLength() / steps;
  const start = points[0]!;
  return {
    start,
    farmhouse: start.position.clone().addScaledVector(start.tangent, -spacing * 1.1),
    cells: points.slice(1, CELL_COUNT + 1),
    city: points[steps]!,
    cellSize: spacing * CELL_FILL,
    spacing,
  };
}

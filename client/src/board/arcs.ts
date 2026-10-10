import { JUMPS, type Jump } from "@sl/shared";
import { QuadraticBezierCurve3, Vector3 } from "three";
import type { Road } from "./road";

export interface JumpArc {
  jump: Jump;
  curve: QuadraticBezierCurve3;
}

/** Height of the arc ends above the ground, so they rise out of the Cell slab. */
const END_HEIGHT = 0.25;

/**
 * One arc per Snake and Ladder, arching higher the further it jumps.
 * Each end sits on the rim of its Cell slab, facing the other end, so the number stays readable.
 */
export function buildArcs(road: Road): JumpArc[] {
  const rim = (road.cellSize / 2) * 0.85;
  return JUMPS.map((jump) => {
    const fromCentre = road.cells[jump.from - 1]!.position.clone().setY(END_HEIGHT);
    const toCentre = road.cells[jump.to - 1]!.position.clone().setY(END_HEIGHT);
    const along = toCentre.clone().sub(fromCentre).normalize();
    const from = fromCentre.addScaledVector(along, rim);
    const to = toCentre.addScaledVector(along, -rim);
    const peak = from
      .clone()
      .lerp(to, 0.5)
      .setY(1 + 0.3 * from.distanceTo(to));
    return { jump, curve: new QuadraticBezierCurve3(from, peak, to) };
  });
}

/** Highest point of an arc. */
export function arcTop(arc: JumpArc): Vector3 {
  return arc.curve.getPoint(0.5);
}

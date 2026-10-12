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

/** Roughly how far apart the arrowheads along an arc are, in world units. */
const ARROW_SPACING = 2.2;
/** Arrowheads stay on this middle stretch of the arc, clear of both Cells. */
const ARROW_SPAN = [0.15, 0.82] as const;

export interface Arrowhead {
  position: Vector3;
  /** Unit direction the arrowhead points: along the arc, towards the destination. */
  direction: Vector3;
}

/** Evenly spaced arrowheads along an arc, so its direction reads from any part of it. */
export function arrowheads(arc: JumpArc): Arrowhead[] {
  const [from, to] = ARROW_SPAN;
  const length = arc.curve.getLength() * (to - from);
  const count = Math.max(1, Math.round(length / ARROW_SPACING));
  return Array.from({ length: count }, (_, i) => {
    const u = from + ((to - from) * (i + 0.5)) / count;
    return { position: arc.curve.getPointAt(u), direction: arc.curve.getTangentAt(u).normalize() };
  });
}

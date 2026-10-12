import type { Seat, Turn } from "@sl/shared";
import { QuadraticBezierCurve3, Quaternion, Vector3 } from "three";
import type { JumpArc } from "./arcs";
import { SLAB_HEIGHT, type Road } from "./road";

/** How long each part of a Turn's animation takes, in milliseconds. */
export const TUMBLE_MS = 900;
export const HOP_MS = 280;
export const PAUSE_MS = 150;
export const FLIGHT_MS = 900;

/** Height of a hop's peak above the line between two Cells. */
const HOP_HEIGHT = 0.35;
/** Edge length of the die. */
export const DIE_SIZE = 0.44;
/** How high above its resting place the die drops from. */
const DROP_HEIGHT = 1.6;
/** Total spin of the tumble, in radians; it slows to a stop on the rolled face. */
const TUMBLE_SPIN = 5 * Math.PI;
const TUMBLE_AXIS = new Vector3(1, 0.35, 0.6).normalize();

/** Number of hops in a Turn's Move: one per Cell moved. */
export function hopCount(turn: Turn): number {
  return turn.landed - turn.from;
}

/** How long a Turn's whole animation takes: the die, the hops and any Jump flight. */
export function turnDuration(turn: Turn): number {
  return TUMBLE_MS + hopCount(turn) * HOP_MS + (turn.jump ? PAUSE_MS + FLIGHT_MS : 0);
}

const SIDE: Record<Seat, number> = { creator: 1, joiner: -1 };

/** Unit vector across the road at `cell` (0 = Start), towards the given Seat's side. */
function across(road: Road, seat: Seat, cell: number): Vector3 {
  const { tangent } = cell === 0 ? road.start : road.cells[cell - 1]!;
  return new Vector3(-tangent.z, 0, tangent.x).multiplyScalar(SIDE[seat]);
}

/**
 * Where a Seat's Token stands on `cell` (0 = Start): on its own side of the road, on top of the
 * slab, so two Tokens on one Cell stand side by side and the Cell number between them stays readable.
 */
export function tokenSpot(road: Road, seat: Seat, cell: number): Vector3 {
  const { position } = cell === 0 ? road.start : road.cells[cell - 1]!;
  return position
    .clone()
    .addScaledVector(across(road, seat, cell), road.cellSize * 0.32)
    .setY(cell === 0 ? 0 : SLAB_HEIGHT);
}

/** Where the die rests after a Turn: on the ground beside the Cell the Move started from. */
export function dieRest(road: Road, turn: Turn): Vector3 {
  const { position } = turn.from === 0 ? road.start : road.cells[turn.from - 1]!;
  return position
    .clone()
    .addScaledVector(across(road, turn.seat, turn.from), road.cellSize / 2 + DIE_SIZE * 0.9)
    .setY(DIE_SIZE / 2);
}

/** Local face normals of the die, by the value on that face; opposite faces add up to 7. */
export const DIE_FACES: Record<number, Vector3> = {
  1: new Vector3(0, 1, 0),
  6: new Vector3(0, -1, 0),
  2: new Vector3(1, 0, 0),
  5: new Vector3(-1, 0, 0),
  3: new Vector3(0, 0, 1),
  4: new Vector3(0, 0, -1),
};

const UP = new Vector3(0, 1, 0);

/** The die's orientation with `value` facing up. */
export function dieFacing(value: number): Quaternion {
  return new Quaternion().setFromUnitVectors(DIE_FACES[value]!, UP);
}

/** Everything needed to pose a Turn's animation at any moment. */
export interface TurnTimeline {
  turn: Turn;
  duration: number;
  /** The Token's spots from the Cell it left to the Cell it landed on, one per hop plus the first. */
  spots: Vector3[];
  /** The Jump flight, from the landed spot to the destination spot, or null without a Jump. */
  flight: QuadraticBezierCurve3 | null;
  dieFrom: Vector3;
  dieTo: Vector3;
}

export function buildTimeline(turn: Turn, road: Road, arcs: readonly JumpArc[]): TurnTimeline {
  const spots: Vector3[] = [];
  for (let cell = turn.from; cell <= turn.landed; cell++) {
    spots.push(tokenSpot(road, turn.seat, cell));
  }
  let flight: QuadraticBezierCurve3 | null = null;
  const arc = turn.jump && arcs.find((a) => a.jump.from === turn.landed);
  if (arc) {
    const start = spots[spots.length - 1]!;
    const end = tokenSpot(road, turn.seat, turn.to);
    // Pick the control point so the flight's midpoint is the drawn arc's peak.
    const peak = arc.curve.getPoint(0.5);
    const control = peak.clone().multiplyScalar(2).sub(start.clone().add(end).multiplyScalar(0.5));
    flight = new QuadraticBezierCurve3(start, control, end);
  }
  const dieTo = dieRest(road, turn);
  return {
    turn,
    duration: turnDuration(turn),
    spots,
    flight,
    dieFrom: dieTo.clone().add(new Vector3(0, DROP_HEIGHT, 0)),
    dieTo,
  };
}

const ease = (u: number) => u * u * (3 - 2 * u);
const clamp01 = (u: number) => Math.min(1, Math.max(0, u));

/** The moving Token's position at `t` ms into the Turn, and the last Cell it has reached. */
export function tokenAt(timeline: TurnTimeline, t: number): { position: Vector3; cell: number } {
  const { turn, spots, flight } = timeline;
  const hopsEnd = TUMBLE_MS + hopCount(turn) * HOP_MS;
  if (t >= timeline.duration) {
    const end = flight ? flight.getPoint(1) : spots[spots.length - 1]!;
    return { position: end.clone(), cell: turn.to };
  }
  if (t < TUMBLE_MS) return { position: spots[0]!.clone(), cell: turn.from };
  if (t < hopsEnd) {
    const hop = Math.floor((t - TUMBLE_MS) / HOP_MS);
    const u = ease((t - TUMBLE_MS - hop * HOP_MS) / HOP_MS);
    const position = spots[hop]!.clone().lerp(spots[hop + 1]!, u);
    position.y += 4 * HOP_HEIGHT * u * (1 - u);
    return { position, cell: turn.from + hop };
  }
  const landed = spots[spots.length - 1]!;
  if (!flight || t < hopsEnd + PAUSE_MS) return { position: landed.clone(), cell: turn.landed };
  const u = ease(clamp01((t - hopsEnd - PAUSE_MS) / FLIGHT_MS));
  return { position: flight.getPoint(u), cell: turn.landed };
}

/** The die's pose at `t` ms into the Turn; it rests showing the Roll once the tumble is over. */
export function dieAt(
  timeline: TurnTimeline,
  t: number,
): { position: Vector3; quaternion: Quaternion; resting: boolean } {
  const { dieFrom, dieTo, turn } = timeline;
  const rest = dieFacing(turn.roll);
  if (t >= TUMBLE_MS) return { position: dieTo.clone(), quaternion: rest, resting: true };
  const u = clamp01(t / TUMBLE_MS);
  const left = 1 - u;
  // Falls in, bounces twice with shrinking height, and spins ever slower onto the rolled face.
  const position = dieFrom.clone().lerp(dieTo, 1 - left * left);
  position.y = dieTo.y + (dieFrom.y - dieTo.y) * left * left * left;
  position.y += 0.3 * Math.abs(Math.sin(3 * Math.PI * u)) * left;
  const spin = new Quaternion().setFromAxisAngle(TUMBLE_AXIS, TUMBLE_SPIN * left * left);
  return { position, quaternion: spin.multiply(rest), resting: false };
}

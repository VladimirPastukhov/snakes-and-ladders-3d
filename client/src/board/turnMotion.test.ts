import type { Turn } from "@sl/shared";
import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { buildArcs } from "./arcs";
import { buildRoad } from "./road";
import {
  DIE_FACES,
  FLIGHT_MS,
  HOP_MS,
  PAUSE_MS,
  TUMBLE_MS,
  buildTimeline,
  dieAt,
  tokenAt,
  tokenSpot,
  turnDuration,
} from "./turnMotion";

const road = buildRoad();
const arcs = buildArcs(road);

const turn = (t: Partial<Turn>): Turn => ({
  seat: "creator",
  roll: 1,
  from: 0,
  landed: 1,
  to: 1,
  jump: null,
  ...t,
});

const timeline = (t: Partial<Turn>) => buildTimeline(turn(t), road, arcs);
/** The moment the n-th hop (1-based) lands. */
const hopEnd = (n: number) => TUMBLE_MS + n * HOP_MS;

function expectNear(actual: Vector3, expected: Vector3, digits = 5) {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
  expect(actual.z).toBeCloseTo(expected.z, digits);
}

describe("turnMotion", () => {
  it("waits for the die, then hops once per Cell onto each Cell's spot", () => {
    const line = timeline({ roll: 4, from: 5, landed: 9, to: 9 });
    expect(line.spots).toHaveLength(5);
    expect(tokenAt(line, TUMBLE_MS - 1)).toMatchObject({ cell: 5 });
    expectNear(tokenAt(line, TUMBLE_MS - 1).position, tokenSpot(road, "creator", 5));
    for (const [n, cell] of [6, 7, 8, 9].entries()) {
      const landed = tokenAt(line, hopEnd(n + 1) - 0.001);
      expectNear(landed.position, tokenSpot(road, "creator", cell), 2);
    }
    // Mid-hop, the Token is in the air.
    const mid = tokenAt(line, TUMBLE_MS + HOP_MS / 2).position;
    expect(mid.y).toBeGreaterThan(tokenSpot(road, "creator", 6).y + 0.2);
    expect(tokenAt(line, line.duration)).toMatchObject({ cell: 9 });
  });

  it("hops from Start, on the ground, up onto Cell 1", () => {
    const line = timeline({ seat: "joiner", roll: 2, from: 0, landed: 2, to: 2 });
    expect(line.spots[0]!.y).toBe(0);
    expectNear(tokenAt(line, TUMBLE_MS).position, tokenSpot(road, "joiner", 0));
    expectNear(tokenAt(line, hopEnd(1) - 0.001).position, tokenSpot(road, "joiner", 1), 2);
    expectNear(tokenAt(line, line.duration).position, tokenSpot(road, "joiner", 2));
  });

  it("stops at the Final Cell", () => {
    const line = timeline({ roll: 5, from: 28, landed: 30, to: 30 });
    expect(line.spots).toHaveLength(3);
    expect(line.duration).toBe(TUMBLE_MS + 2 * HOP_MS);
    expectNear(tokenAt(line, line.duration).position, tokenSpot(road, "creator", 30));
  });

  it.each([
    { roll: 3, from: 0, landed: 3, to: 11, jump: "ladder" as const },
    { roll: 6, from: 21, landed: 27, to: 19, jump: "snake" as const },
  ])("flies along the arc from $landed to $to", (t) => {
    const line = timeline(t);
    const flightStart = hopEnd(t.landed - t.from) + PAUSE_MS;
    expectNear(tokenAt(line, flightStart).position, tokenSpot(road, "creator", t.landed));
    const arc = arcs.find((a) => a.jump.from === t.landed)!;
    expectNear(tokenAt(line, flightStart + FLIGHT_MS / 2).position, arc.curve.getPoint(0.5));
    expectNear(tokenAt(line, line.duration).position, tokenSpot(road, "creator", t.to));
    expect(tokenAt(line, line.duration).cell).toBe(t.to);
  });

  it("finishes the longest Turn within 5 seconds", () => {
    const longest = turn({ roll: 6, from: 21, landed: 27, to: 19, jump: "snake" });
    expect(turnDuration(longest)).toBe(TUMBLE_MS + 6 * HOP_MS + PAUSE_MS + FLIGHT_MS);
    expect(turnDuration(longest)).toBeLessThanOrEqual(5000);
  });

  it.each([1, 2, 3, 4, 5, 6])("lands the die with %i on top", (roll) => {
    const line = timeline({ roll, from: 4, landed: 4 + roll, to: 4 + roll });
    const { quaternion, resting } = dieAt(line, TUMBLE_MS);
    expect(resting).toBe(true);
    const top = Object.entries(DIE_FACES).reduce((best, entry) =>
      entry[1].clone().applyQuaternion(quaternion).y > best[1].clone().applyQuaternion(quaternion).y
        ? entry
        : best,
    );
    expect(Number(top[0])).toBe(roll);
    expect(top[1].clone().applyQuaternion(quaternion).y).toBeCloseTo(1, 5);
  });

  it("throws the die from above and lands it beside the Cell, off the road", () => {
    const line = timeline({ roll: 3, from: 5, landed: 8, to: 8 });
    expect(dieAt(line, 0).position.y).toBeGreaterThan(1);
    expect(dieAt(line, TUMBLE_MS / 2).resting).toBe(false);
    const rest = dieAt(line, TUMBLE_MS).position;
    expectNear(dieAt(line, TUMBLE_MS - 0.01).position, rest, 2);
    const cell = road.cells[4]!.position;
    expect(new Vector3(rest.x, 0, rest.z).distanceTo(cell)).toBeGreaterThan(road.cellSize / 2);
  });
});

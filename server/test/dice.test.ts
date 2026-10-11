import { describe, expect, it } from "vitest";
import { pickFirst, rollDie } from "../src/dice";

describe("rollDie", () => {
  it("throws 1 to 6, each about equally often", () => {
    const counts = new Map<number, number>();
    for (let i = 0; i < 6000; i++) {
      const roll = rollDie();
      counts.set(roll, (counts.get(roll) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThanOrEqual(800);
      expect(count).toBeLessThanOrEqual(1200);
    }
  });
});

describe("pickFirst", () => {
  it("picks both Seats, about equally often", () => {
    let creator = 0;
    for (let i = 0; i < 2000; i++) if (pickFirst() === "creator") creator++;
    expect(creator).toBeGreaterThan(800);
    expect(creator).toBeLessThan(1200);
  });
});

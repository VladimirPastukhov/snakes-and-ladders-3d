import { CELL_COUNT } from "@sl/shared";
import { describe, expect, it } from "vitest";
import { REGIONS, regionOf } from "./oz";

describe("Oz Regions", () => {
  it("put every Cell 1–30 in exactly one Region", () => {
    for (let cell = 1; cell <= CELL_COUNT; cell++) {
      const matches = REGIONS.filter((r) => cell >= r.firstCell && cell <= r.lastCell);
      expect(matches, `Cell ${cell}`).toHaveLength(1);
    }
  });

  it("follow the book's order without gaps", () => {
    expect(REGIONS.map((r) => r.name)).toEqual([
      "Munchkin Country",
      "Scarecrow's Cornfield",
      "Dark Forest",
      "Kalidah Ravine",
      "River",
      "Poppy Field",
      "Emerald City",
    ]);
    REGIONS.forEach((region, i) => {
      const previous = REGIONS[i - 1];
      expect(region.firstCell).toBe(previous ? previous.lastCell + 1 : 1);
    });
  });

  it("give neighbouring Regions different ground colours", () => {
    expect(regionOf(5)?.groundColor).not.toBe(regionOf(6)?.groundColor);
    expect(new Set(REGIONS.map((r) => r.groundColor)).size).toBe(REGIONS.length);
  });
});

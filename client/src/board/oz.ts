// Oz presentation data: names and colours only. The rules-level Board lives in @sl/shared.

export interface Region {
  name: string;
  /** First and last Cell of the Region, inclusive. */
  firstCell: number;
  lastCell: number;
  groundColor: string;
}

/** Regions in the order the road passes through them in the book. */
export const REGIONS: readonly Region[] = [
  { name: "Munchkin Country", firstCell: 1, lastCell: 5, groundColor: "#6f95c9" },
  { name: "Scarecrow's Cornfield", firstCell: 6, lastCell: 10, groundColor: "#a3b55a" },
  { name: "Dark Forest", firstCell: 11, lastCell: 15, groundColor: "#2f5d3a" },
  { name: "Kalidah Ravine", firstCell: 16, lastCell: 20, groundColor: "#8a6f5a" },
  { name: "River", firstCell: 21, lastCell: 23, groundColor: "#3f8fa6" },
  { name: "Poppy Field", firstCell: 24, lastCell: 29, groundColor: "#c0483f" },
  { name: "Emerald City", firstCell: 30, lastCell: 30, groundColor: "#2fae66" },
];

/** Event Name of each Snake and Ladder, keyed by its start Cell. */
export const EVENT_NAMES: Readonly<Record<number, string>> = {
  3: "Good Witch's Kiss",
  16: "Tin Woodman's Log Bridge",
  24: "Rescue by the Field Mice",
  18: "The Kalidahs",
  22: "Swept Away by the River",
  27: "Deadly Poppies",
};

export const COLORS = {
  road: "#f2c94c",
  path: "#d9a92e",
  ladder: "#22d3ee",
  snake: "#e040fb",
  baseGround: "#556b4e",
  creatorToken: "#e69f00",
  joinerToken: "#0072b2",
} as const;

export function regionOf(cell: number): Region | undefined {
  return REGIONS.find((region) => cell >= region.firstCell && cell <= region.lastCell);
}

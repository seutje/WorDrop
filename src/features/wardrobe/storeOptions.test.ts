import { expect, it } from "vitest";
import { storeOptions } from "./storeOptions";
import type { ClothingItem } from "../../types/clothing";
it("returns sorted trimmed stores and deduplicates casing", () => {
  const items = [
    { store: " Uniqlo " },
    { store: "uniqlo" },
    { store: "Gap" },
    {},
    { store: " " },
  ] as ClothingItem[];
  expect(storeOptions(items)).toEqual([
    "Gap",
    "H&M",
    "Rickis",
    "RW&CO",
    "Uniqlo",
    "Zara",
  ]);
});

it("includes alphabetized defaults in an empty wardrobe", () => {
  expect(storeOptions([])).toEqual(["H&M", "Rickis", "RW&CO", "Zara"]);
});
it("merges defaults and custom names without duplicate casing", () => {
  expect(
    storeOptions([
      { store: " zara " },
      { store: "apple" },
      { store: "APPLE" },
    ] as ClothingItem[]),
  ).toEqual(["apple", "H&M", "Rickis", "RW&CO", "Zara"]);
});

import { describe, expect, it } from "vitest";
import { localDate, monthCutoff, lastWornByItem } from "./wearHistory";
import {
  emptyClosetFilters,
  filterClothingItems,
} from "../features/wardrobe/closetFilters";
import type { ClothingItem } from "../types/clothing";
import type { WearEvent } from "./database/wearRepository";

const event = (wornOn: string, itemIds: string[]): WearEvent => ({
  id: wornOn,
  wornOn,
  itemIds,
  outfitId: "outfit",
  sourceName: "Weekend",
  isOutfit: true,
  createdAt: "",
});
const item = (
  id: string,
  ownership: "owned" | "wishlist" = "owned",
): ClothingItem => ({
  id,
  ownership,
  name: id,
  category: "top",
  colors: [],
  seasons: [],
  occasions: [],
  styleTags: [],
  favorite: false,
  imagePath: "image.jpg",
  createdAt: "",
  updatedAt: "",
});

describe("wear history filters", () => {
  it("uses local dates and clamps month ends, including leap years", () => {
    expect(localDate(new Date(2026, 9, 7, 0))).toBe("2026-10-07");
    expect(monthCutoff(1, new Date(2026, 2, 31))).toBe("2026-02-28");
    expect(monthCutoff(12, new Date(2024, 1, 29))).toBe("2023-02-28");
    expect(monthCutoff(3, new Date(2026, 0, 31))).toBe("2025-10-31");
  });
  it("finds the latest wear across individual and propagated events in any order", () => {
    expect(
      lastWornByItem([
        event("2026-09-01", ["a", "b"]),
        event("2026-01-01", ["a"]),
        event("2026-10-01", ["b"]),
      ]),
    ).toEqual({ a: "2026-09-01", b: "2026-10-01" });
  });
  it.each(["1", "3", "6", "12"] as const)(
    "filters %s months with an inclusive cutoff and excludes wishlist",
    (months) => {
      const today = new Date(2026, 9, 7);
      const cutoff = monthCutoff(Number(months), today);
      const result = filterClothingItems(
        [
          item("never"),
          item("old"),
          item("boundary"),
          item("recent"),
          item("wish", "wishlist"),
        ],
        { ...emptyClosetFilters, notWornMonths: months },
        { old: "2020-01-01", boundary: cutoff, recent: "2026-10-07" },
        today,
      );
      expect(result.map(({ id }) => id)).toEqual(["never", "old"]);
    },
  );
});

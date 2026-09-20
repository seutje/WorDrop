import { describe, expect, it } from "vitest";
import type { ClothingItem } from "../../types/clothing";
import type { Outfit } from "../../types/outfit";
import {
  emptyOutfitFilters,
  filterOutfits,
  hasActiveOutfitFilters,
  sortOutfits,
} from "./outfitFilters";

const wardrobe: ClothingItem[] = [
  {
    id: "shirt",
    name: "Blue work shirt",
    category: "top",
    colors: ["blue"],
    seasons: ["spring"],
    occasions: ["work"],
    styleTags: [],
    ownership: "owned",
    favorite: false,
    imagePath: "shirt.jpg",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "shoes",
    name: "Black wishlist boots",
    category: "shoes",
    colors: ["black"],
    seasons: ["winter"],
    occasions: ["casual"],
    styleTags: [],
    ownership: "wishlist",
    favorite: false,
    imagePath: "boots.jpg",
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  },
];

const outfits: Outfit[] = [
  {
    id: "work",
    name: "Office day",
    notes: "For presentations",
    favorite: false,
    itemIds: ["shirt"],
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "weekend",
    name: "Weekend walk",
    itemIds: ["shoes"],
    favorite: true,
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
  },
];

describe("filterOutfits", () => {
  it("searches outfit names, notes, and contained item names", () => {
    expect(
      filterOutfits(outfits, wardrobe, {
        ...emptyOutfitFilters,
        search: "PRESENTATIONS",
      }).map(({ id }) => id),
    ).toEqual(["work"]);
    expect(
      filterOutfits(outfits, wardrobe, {
        ...emptyOutfitFilters,
        search: "wishlist boots",
      }).map(({ id }) => id),
    ).toEqual(["weekend"]);
  });

  it("combines clothing metadata filters", () => {
    expect(
      filterOutfits(outfits, wardrobe, {
        ...emptyOutfitFilters,
        category: "top",
        ownership: "owned",
        color: "blue",
        season: "spring",
        occasion: "work",
      }).map(({ id }) => id),
    ).toEqual(["work"]);
  });

  it("reports whether filters are active", () => {
    expect(hasActiveOutfitFilters(emptyOutfitFilters)).toBe(false);
    expect(
      hasActiveOutfitFilters({ ...emptyOutfitFilters, category: "shoes" }),
    ).toBe(true);
  });
});

describe("sortOutfits", () => {
  it("sorts without mutating the source", () => {
    const source = [...outfits];
    expect(sortOutfits(outfits, "newest").map(({ id }) => id)).toEqual([
      "weekend",
      "work",
    ]);
    expect(sortOutfits(outfits, "oldest").map(({ id }) => id)).toEqual([
      "work",
      "weekend",
    ]);
    expect(sortOutfits(outfits, "alphabetical").map(({ id }) => id)).toEqual([
      "work",
      "weekend",
    ]);
    expect(sortOutfits(outfits, "favorite").map(({ id }) => id)).toEqual([
      "weekend",
      "work",
    ]);
    expect(outfits).toEqual(source);
  });
});

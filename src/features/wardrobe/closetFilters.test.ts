import { describe, expect, it } from "vitest";
import type { ClothingItem } from "../../types/clothing";
import {
  emptyClosetFilters,
  filterClothingItems,
  type ClosetFilters,
} from "./closetFilters";

const item = (id: string, values: Partial<ClothingItem>): ClothingItem => ({
  id,
  name: `Item ${id}`,
  category: "top",
  colors: [],
  seasons: [],
  occasions: [],
  styleTags: [],
  ownership: "owned",
  favorite: false,
  imagePath: `images/original/${id}.jpg`,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...values,
});

const wardrobe = [
  item("1", {
    name: "Black summer tee",
    colors: ["black"],
    seasons: ["summer"],
    occasions: ["casual"],
  }),
  item("2", {
    name: "Blue work trousers",
    category: "bottom",
    colors: ["blue"],
    seasons: ["autumn"],
    occasions: ["work"],
  }),
  item("3", {
    name: "Black party dress",
    category: "dress",
    colors: ["black"],
    seasons: ["summer"],
    occasions: ["party"],
    ownership: "wishlist",
  }),
];

describe("filterClothingItems", () => {
  it("searches names without case sensitivity", () => {
    expect(
      filterClothingItems(wardrobe, {
        ...emptyClosetFilters,
        search: "BLUE WORK",
      }).map(({ id }) => id),
    ).toEqual(["2"]);
  });

  it("combines every active filter", () => {
    const filters: ClosetFilters = {
      search: "black",
      category: "dress",
      ownership: "wishlist",
      color: "black",
      season: "summer",
      occasion: "party",
    };
    expect(filterClothingItems(wardrobe, filters).map(({ id }) => id)).toEqual([
      "3",
    ]);
  });

  it("returns all items after filters are cleared", () => {
    expect(filterClothingItems(wardrobe, emptyClosetFilters)).toHaveLength(3);
  });

  it("filters a representative 1,000-item wardrobe", () => {
    const largeWardrobe = Array.from({ length: 1_000 }, (_, index) =>
      item(String(index), {
        name: index === 999 ? "Target jacket" : `Generated item ${index}`,
      }),
    );
    expect(
      filterClothingItems(largeWardrobe, {
        ...emptyClosetFilters,
        search: "target",
      }).map(({ id }) => id),
    ).toEqual(["999"]);
  });
});

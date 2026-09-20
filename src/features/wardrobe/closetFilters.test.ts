import { describe, expect, it } from "vitest";
import type { ClothingItem } from "../../types/clothing";
import {
  emptyClosetFilters,
  filterClothingItems,
  sortClothingItems,
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

describe("sortClothingItems", () => {
  const sortableWardrobe = [
    item("1", { name: "Zebra coat", createdAt: "2026-02-01T00:00:00Z" }),
    item("2", { name: "Amber dress", createdAt: "2026-03-01T00:00:00Z" }),
    item("3", {
      name: "Blue shirt",
      createdAt: "2026-03-01T00:00:00Z",
      favorite: true,
    }),
    item("4", {
      name: "Coral shoes",
      createdAt: "2026-01-01T00:00:00Z",
      favorite: true,
    }),
  ];

  it("sorts newest first and uses name as the secondary order", () => {
    expect(
      sortClothingItems(sortableWardrobe, "newest").map(({ id }) => id),
    ).toEqual(["2", "3", "1", "4"]);
  });

  it("sorts oldest first", () => {
    expect(
      sortClothingItems(sortableWardrobe, "oldest").map(({ id }) => id),
    ).toEqual(["4", "1", "2", "3"]);
  });

  it("sorts alphabetically and uses newest as the secondary order", () => {
    expect(
      sortClothingItems(
        [
          item("old", { name: "Same", createdAt: "2026-01-01T00:00:00Z" }),
          item("new", { name: "same", createdAt: "2026-02-01T00:00:00Z" }),
        ],
        "alphabetical",
      ).map(({ id }) => id),
    ).toEqual(["new", "old"]);
  });

  it("puts favorites first and orders each group newest first", () => {
    expect(
      sortClothingItems(sortableWardrobe, "favorite").map(({ id }) => id),
    ).toEqual(["3", "4", "2", "1"]);
  });

  it("does not mutate the source array", () => {
    const source = [...sortableWardrobe];
    sortClothingItems(source, "newest");
    expect(source).toEqual(sortableWardrobe);
  });
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

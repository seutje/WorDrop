import { describe, expect, it } from "vitest";
import { buildWardrobeInsights, distribution } from "./wardrobeInsights";
import type { ClothingItem } from "../types/clothing";
import type { WearEvent } from "./database/wearRepository";
import type { Outfit } from "../types/outfit";

const item = (
  id: string,
  changes: Partial<ClothingItem> = {},
): ClothingItem => ({
  id,
  name: id,
  category: "top",
  colors: [],
  seasons: [],
  occasions: [],
  styleTags: [],
  ownership: "owned",
  favorite: false,
  imagePath: "photo.jpg",
  createdAt: "",
  updatedAt: "",
  ...changes,
});
const event = (wornOn: string, itemIds: string[]): WearEvent => ({
  id: wornOn,
  wornOn,
  itemIds,
  outfitId: null,
  sourceName: "Test",
  isOutfit: false,
  createdAt: "",
});
const outfit = (itemIds: string[]): Outfit => ({
  id: "outfit",
  name: "Test",
  itemIds,
  favorite: false,
  createdAt: "",
  updatedAt: "",
});
const today = new Date(2026, 9, 7);

describe("wardrobe insights", () => {
  it("normalizes tags, counts a tag once per piece and includes missing values", () => {
    const rows = distribution(
      [item("a", { styleTags: [" Classic ", "classic", "Casual"] }), item("b")],
      (piece) => piece.styleTags,
    );
    expect(rows).toEqual([
      { label: "casual", count: 1, percentage: 50 },
      { label: "classic", count: 1, percentage: 50 },
      { label: "Not specified", count: 1, percentage: 50 },
    ]);
  });
  it("groups subtypes within each category and respects ownership", () => {
    const data = buildWardrobeInsights(
      [
        item("a", { subtype: "Shirt" }),
        item("b", { subtype: " shirt " }),
        item("c", {
          category: "bottom",
          subtype: "Jeans",
          ownership: "wishlist",
        }),
      ],
      [],
      [],
      "owned",
      "all",
      today,
    );
    expect(data.subtypes).toEqual([
      {
        category: "top",
        total: 2,
        rows: [{ label: "shirt", count: 2, percentage: 100 }],
      },
    ]);
    expect(data.wishlistCount).toBe(0);
  });
  it("deduplicates propagated and individual wears on the same date, excluding wishlist and removed pieces", () => {
    const data = buildWardrobeInsights(
      [item("a"), item("b"), item("wish", { ownership: "wishlist" })],
      [],
      [
        event("2026-10-01", ["a", "a", "wish", "deleted"]),
        event("2026-10-01", ["a", "b"]),
        event("2026-10-02", ["a"]),
      ],
      "all",
      "all",
      today,
    );
    expect(data.mostWorn.map((row) => [row.item.id, row.count])).toEqual([
      ["a", 2],
      ["b", 1],
    ]);
    expect(data.totalPieceDays).toBe(3);
    expect(data.wearDays).toBe(2);
    expect(data.wornCount).toBe(2);
    expect(data.mostWorn[0].lastWorn).toBe("2026-10-02");
  });
  it("uses an inclusive calendar cutoff, ignores future wears, and includes zero wears in least worn", () => {
    const data = buildWardrobeInsights(
      [item("a"), item("b"), item("c")],
      [],
      [
        event("2026-09-06", ["a"]),
        event("2026-09-07", ["b"]),
        event("2026-10-08", ["c"]),
      ],
      "owned",
      "1",
      today,
    );
    expect(data.mostWorn.map((row) => row.item.id)).toEqual(["b"]);
    expect(data.leastWorn.map((row) => [row.item.id, row.count])).toEqual([
      ["a", 0],
      ["c", 0],
      ["b", 1],
    ]);
  });
  it("keeps saved outfit usage separate from wear history and counts each outfit once", () => {
    const data = buildWardrobeInsights(
      [item("a"), item("b")],
      [outfit(["a", "a", "deleted"])],
      [],
      "owned",
      "all",
      today,
    );
    expect(data.outfitUsage.map((row) => [row.item.id, row.count])).toEqual([
      ["a", 1],
      ["b", 0],
    ]);
    expect(data.unusedInOutfits[0].item.id).toBe("b");
    expect(data.outfitCount).toBe(1);
    expect(data.wornCount).toBe(0);
  });
  it("uses stable name/id tie breaks regardless of input order", () => {
    const items = [item("z", { name: "Same" }), item("a", { name: "Same" })];
    expect(
      buildWardrobeInsights(items, [], [], "owned", "all", today).leastWorn.map(
        (row) => row.item.id,
      ),
    ).toEqual(["a", "z"]);
    expect(
      buildWardrobeInsights(
        items.reverse(),
        [],
        [],
        "owned",
        "all",
        today,
      ).leastWorn.map((row) => row.item.id),
    ).toEqual(["a", "z"]);
  });
  it("handles an empty wardrobe without invalid percentages", () => {
    const data = buildWardrobeInsights([], [], [], "all", "all", today);
    expect(data.categories).toEqual([]);
    expect(data.subtypes).toEqual([]);
    expect(data.mostWorn).toEqual([]);
    expect(data.wearDays).toBe(0);
  });
});

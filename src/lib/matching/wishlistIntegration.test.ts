import { describe, expect, it } from "vitest";
import type { ClothingItem } from "../../types/clothing";
import {
  evaluateWishlistIntegration,
  STRONG_WISHLIST_MATCH_SCORE,
} from "./wishlistIntegration";

function item(id: string, values: Partial<ClothingItem> = {}): ClothingItem {
  return {
    id,
    name: id,
    category: "top",
    colors: ["black"],
    seasons: ["autumn"],
    occasions: ["casual"],
    styleTags: ["classic"],
    ownership: "owned",
    favorite: false,
    imagePath: `${id}.jpg`,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...values,
  };
}

describe("evaluateWishlistIntegration", () => {
  const wishlist = item("wish", {
    category: "bottom",
    ownership: "wishlist",
  });

  it("uses only owned wardrobe items", () => {
    const owned = item("owned", { category: "top" });
    const anotherWish = item("other-wish", {
      category: "shoes",
      ownership: "wishlist",
    });
    const result = evaluateWishlistIntegration(wishlist, [
      wishlist,
      owned,
      anotherWish,
    ]);
    expect(result.ownedItemCount).toBe(1);
    expect(result.groups.flatMap((group) => group.matches)).toHaveLength(1);
    expect(result.groups.flatMap((group) => group.matches)[0].item.id).toBe(
      "owned",
    );
  });

  it("groups compatible matches by category and counts strong matches", () => {
    const top = item("top", { category: "top" });
    const shoes = item("shoes", { category: "shoes" });
    const result = evaluateWishlistIntegration(wishlist, [top, shoes]);
    expect(result.groups.map((group) => group.category)).toEqual([
      "top",
      "shoes",
    ]);
    expect(result.strongMatchCount).toBe(2);
    expect(
      result.groups
        .flatMap((group) => group.matches)
        .every(
          ({ result: match }) => match.score >= STRONG_WISHLIST_MATCH_SCORE,
        ),
    ).toBe(true);
  });

  it("remains understandable with an empty owned wardrobe", () => {
    expect(evaluateWishlistIntegration(wishlist, [])).toEqual({
      ownedItemCount: 0,
      strongMatchCount: 0,
      compatibleMatchCount: 0,
      categoryCount: 0,
      groups: [],
    });
  });

  it("changes results when wishlist metadata changes", () => {
    const candidate = item("candidate", { category: "top" });
    const strong = evaluateWishlistIntegration(wishlist, [candidate]);
    const changed = evaluateWishlistIntegration(
      {
        ...wishlist,
        colors: ["purple"],
        seasons: ["winter"],
        occasions: ["formal"],
        styleTags: ["romantic"],
      },
      [candidate],
    );
    expect(strong.strongMatchCount).toBeGreaterThan(changed.strongMatchCount);
  });
});

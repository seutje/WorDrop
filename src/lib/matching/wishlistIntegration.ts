import {
  clothingCategories,
  type ClothingCategory,
  type ClothingItem,
} from "../../types/clothing";
import { rankMatches } from "./scoreMatch";
import type { MatchResult } from "./types";

export const STRONG_WISHLIST_MATCH_SCORE = 70;
export const COMPATIBLE_WISHLIST_MATCH_SCORE = 55;

export type WishlistMatch = {
  item: ClothingItem;
  result: MatchResult;
};

export type WishlistIntegration = {
  ownedItemCount: number;
  strongMatchCount: number;
  compatibleMatchCount: number;
  categoryCount: number;
  groups: Array<{
    category: ClothingCategory;
    matches: WishlistMatch[];
  }>;
};

export function evaluateWishlistIntegration(
  wishlistItem: ClothingItem,
  wardrobe: readonly ClothingItem[],
): WishlistIntegration {
  const ownedItems = wardrobe.filter(
    (item) => item.ownership === "owned" && item.id !== wishlistItem.id,
  );
  const byId = new Map(ownedItems.map((item) => [item.id, item]));
  const matches = rankMatches(wishlistItem, ownedItems).flatMap((result) => {
    const item = byId.get(result.itemId);
    return item ? [{ item, result }] : [];
  });
  const compatible = matches.filter(
    ({ result }) => result.score >= COMPATIBLE_WISHLIST_MATCH_SCORE,
  );
  const groups = clothingCategories.flatMap((category) => {
    const categoryMatches = compatible.filter(
      ({ item }) => item.category === category,
    );
    return categoryMatches.length
      ? [{ category, matches: categoryMatches }]
      : [];
  });
  return {
    ownedItemCount: ownedItems.length,
    strongMatchCount: matches.filter(
      ({ result }) => result.score >= STRONG_WISHLIST_MATCH_SCORE,
    ).length,
    compatibleMatchCount: compatible.length,
    categoryCount: groups.length,
    groups,
  };
}

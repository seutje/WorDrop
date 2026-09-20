import type {
  ClothingCategory,
  ClothingColor,
  ClothingItem,
  Occasion,
  Ownership,
  Season,
} from "../../types/clothing";
import type { Outfit } from "../../types/outfit";

export type OutfitFilters = {
  search: string;
  category: ClothingCategory | "";
  ownership: Ownership | "";
  color: ClothingColor | "";
  season: Season | "";
  occasion: Occasion | "";
};

export type OutfitSort = "newest" | "oldest" | "alphabetical" | "favorite";

export const emptyOutfitFilters: OutfitFilters = {
  search: "",
  category: "",
  ownership: "",
  color: "",
  season: "",
  occasion: "",
};

export const defaultOutfitSort: OutfitSort = "newest";

export function hasActiveOutfitFilters(filters: OutfitFilters): boolean {
  return Object.values(filters).some(Boolean);
}

export function filterOutfits(
  outfits: Outfit[],
  wardrobe: ClothingItem[],
  filters: OutfitFilters,
): Outfit[] {
  const wardrobeById = new Map(wardrobe.map((item) => [item.id, item]));
  const search = filters.search.trim().toLocaleLowerCase();

  return outfits.filter((outfit) => {
    const items = outfit.itemIds.flatMap((id) => {
      const item = wardrobeById.get(id);
      return item ? [item] : [];
    });
    const searchableText = [
      outfit.name,
      outfit.notes ?? "",
      ...items.map((item) => item.name),
    ]
      .join(" ")
      .toLocaleLowerCase();

    return (
      (!search || searchableText.includes(search)) &&
      (!filters.category ||
        items.some((item) => item.category === filters.category)) &&
      (!filters.ownership ||
        items.some((item) => item.ownership === filters.ownership)) &&
      (!filters.color ||
        items.some((item) =>
          item.colors.includes(filters.color as ClothingColor),
        )) &&
      (!filters.season ||
        items.some((item) =>
          item.seasons.includes(filters.season as Season),
        )) &&
      (!filters.occasion ||
        items.some((item) =>
          item.occasions.includes(filters.occasion as Occasion),
        ))
    );
  });
}

export function sortOutfits(outfits: Outfit[], sort: OutfitSort): Outfit[] {
  return [...outfits].sort((left, right) => {
    if (sort === "favorite") {
      return (
        Number(right.favorite) - Number(left.favorite) ||
        right.createdAt.localeCompare(left.createdAt) ||
        left.name.localeCompare(right.name)
      );
    }
    if (sort === "alphabetical") {
      return (
        left.name.localeCompare(right.name, undefined, {
          sensitivity: "base",
        }) || right.createdAt.localeCompare(left.createdAt)
      );
    }

    const dateOrder =
      sort === "oldest"
        ? left.createdAt.localeCompare(right.createdAt)
        : right.createdAt.localeCompare(left.createdAt);
    return dateOrder || left.name.localeCompare(right.name);
  });
}

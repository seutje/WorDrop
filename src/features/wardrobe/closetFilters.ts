import type {
  ClothingCategory,
  ClothingColor,
  ClothingItem,
  Occasion,
  Ownership,
  Season,
} from "../../types/clothing";

export type ClosetFilters = {
  search: string;
  category: ClothingCategory | "";
  ownership: Ownership | "";
  color: ClothingColor | "";
  season: Season | "";
  occasion: Occasion | "";
};

export const emptyClosetFilters: ClosetFilters = {
  search: "",
  category: "",
  ownership: "",
  color: "",
  season: "",
  occasion: "",
};

export function filterClothingItems(
  items: readonly ClothingItem[],
  filters: ClosetFilters,
): ClothingItem[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return items.filter(
    (item) =>
      (!search || item.name.toLocaleLowerCase().includes(search)) &&
      (!filters.category || item.category === filters.category) &&
      (!filters.ownership || item.ownership === filters.ownership) &&
      (!filters.color || item.colors.includes(filters.color)) &&
      (!filters.season || item.seasons.includes(filters.season)) &&
      (!filters.occasion || item.occasions.includes(filters.occasion)),
  );
}

export function hasActiveFilters(filters: ClosetFilters): boolean {
  return Object.values(filters).some(Boolean);
}

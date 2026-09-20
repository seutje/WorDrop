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

export type ClosetSort = "newest" | "oldest" | "alphabetical" | "favorite";

export const defaultClosetSort: ClosetSort = "newest";

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

const compareNewest = (left: ClothingItem, right: ClothingItem) =>
  right.createdAt.localeCompare(left.createdAt);

const compareAlphabetical = (left: ClothingItem, right: ClothingItem) =>
  left.name.localeCompare(right.name, undefined, { sensitivity: "base" });

export function sortClothingItems(
  items: readonly ClothingItem[],
  sort: ClosetSort,
): ClothingItem[] {
  return [...items].sort((left, right) => {
    let primary = 0;

    if (sort === "newest") primary = compareNewest(left, right);
    if (sort === "oldest")
      primary = left.createdAt.localeCompare(right.createdAt);
    if (sort === "alphabetical") primary = compareAlphabetical(left, right);
    if (sort === "favorite")
      primary = Number(right.favorite) - Number(left.favorite);

    if (primary !== 0) return primary;

    const secondary =
      sort === "newest"
        ? compareAlphabetical(left, right)
        : compareNewest(left, right);

    return (
      secondary ||
      compareAlphabetical(left, right) ||
      left.id.localeCompare(right.id)
    );
  });
}

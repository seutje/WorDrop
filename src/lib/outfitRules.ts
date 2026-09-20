import type { ClothingItem } from "../types/clothing";

export function shouldExcludeBottoms(
  selectedItems: ClothingItem[],
  pickerIndex: number | null,
  allowMultipleBottoms: boolean,
): boolean {
  if (allowMultipleBottoms) return false;
  if (
    pickerIndex !== null &&
    selectedItems[pickerIndex]?.category === "bottom"
  ) {
    return false;
  }
  return selectedItems.some((item) => item.category === "bottom");
}

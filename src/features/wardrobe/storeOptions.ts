import type { ClothingItem } from "../../types/clothing";
export function storeOptions(items: readonly ClothingItem[]): string[] {
  const stores = new Map<string, string>(
    ["Zara", "H&M", "RW&CO", "Rickis"].map((store) => [
      store.toLocaleLowerCase(),
      store,
    ]),
  );
  for (const item of items) {
    const value = item.store?.trim();
    if (value && !stores.has(value.toLocaleLowerCase()))
      stores.set(value.toLocaleLowerCase(), value);
  }
  return [...stores.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

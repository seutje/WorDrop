import {
  clothingCategories,
  type ClothingItem,
  type Ownership,
} from "../types/clothing";
import type { Outfit } from "../types/outfit";
import type { WearEvent } from "./database/wearRepository";
import { localDate, monthCutoff } from "./wearHistory";

export type DistributionRow = {
  label: string;
  count: number;
  percentage: number;
};
export type InsightScope = Ownership | "all";
export type WearPeriod = "all" | "1" | "3" | "6" | "12";

// Each piece counts once per distinct tag; multi-tag percentages can exceed 100%.
export function distribution(
  items: readonly ClothingItem[],
  values: (item: ClothingItem) => readonly string[],
): DistributionRow[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const labels = new Set(
      values(item)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );
    if (!labels.size) labels.add("Not specified");
    for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts]
    .map(([label, count]) => ({
      label,
      count,
      percentage: items.length ? (count / items.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildWardrobeInsights(
  items: readonly ClothingItem[],
  outfits: readonly Outfit[],
  events: readonly WearEvent[],
  scope: InsightScope,
  period: WearPeriod,
  today = new Date(),
) {
  const selected = items.filter(
    (item) => scope === "all" || item.ownership === scope,
  );
  const owned = selected.filter((item) => item.ownership === "owned");
  const cutoff = period === "all" ? "" : monthCutoff(Number(period), today);
  const end = localDate(today);
  const days = new Map<string, Set<string>>();
  const latest = new Map<string, string>();
  const activity = new Set<string>();
  const ownedIds = new Set(owned.map((item) => item.id));
  for (const event of events) {
    if (event.wornOn < cutoff || event.wornOn > end) continue;
    for (const id of event.itemIds) {
      if (!ownedIds.has(id)) continue;
      const recorded = days.get(id) ?? new Set<string>();
      recorded.add(event.wornOn);
      days.set(id, recorded);
      if (event.wornOn > (latest.get(id) ?? "")) latest.set(id, event.wornOn);
      activity.add(event.wornOn);
    }
  }
  const usage = new Map<string, number>();
  for (const outfit of outfits)
    for (const id of new Set(outfit.itemIds))
      usage.set(id, (usage.get(id) ?? 0) + 1);
  const tie = (a: { item: ClothingItem }, b: { item: ClothingItem }) =>
    a.item.name.localeCompare(b.item.name) ||
    a.item.id.localeCompare(b.item.id);
  const wear = owned.map((item) => ({
    item,
    count: days.get(item.id)?.size ?? 0,
    lastWorn: latest.get(item.id),
  }));
  const outfitUsage = selected
    .map((item) => ({ item, count: usage.get(item.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || tie(a, b));
  const selectedIds = new Set(selected.map((item) => item.id));
  return {
    selected,
    ownedCount: owned.length,
    wishlistCount: selected.length - owned.length,
    favorites: selected.filter((item) => item.favorite).length,
    categories: distribution(selected, (item) => [item.category]),
    subtypes: clothingCategories
      .map((category) => {
        const group = selected.filter((item) => item.category === category);
        return {
          category,
          total: group.length,
          rows: distribution(group, (item) => [item.subtype ?? ""]),
        };
      })
      .filter((group) => group.total > 0),
    colors: distribution(selected, (item) => item.colors),
    occasions: distribution(selected, (item) => item.occasions),
    seasons: distribution(selected, (item) => item.seasons),
    styles: distribution(selected, (item) => item.styleTags),
    materials: distribution(selected, (item) => [item.material ?? ""]),
    patterns: distribution(selected, (item) => [item.pattern ?? ""]),
    sizes: distribution(selected, (item) => [item.size ?? ""]),
    mostWorn: [...wear]
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count || tie(a, b)),
    leastWorn: [...wear].sort((a, b) => a.count - b.count || tie(a, b)),
    wornCount: wear.filter((row) => row.count > 0).length,
    wearDays: activity.size,
    totalPieceDays: wear.reduce((total, row) => total + row.count, 0),
    outfitUsage,
    unusedInOutfits: outfitUsage.filter((row) => row.count === 0),
    outfitCount: outfits.filter((outfit) =>
      outfit.itemIds.some((id) => selectedIds.has(id)),
    ).length,
  };
}

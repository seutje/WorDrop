import type { WearEvent } from "./database/wearRepository";

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function monthCutoff(months: number, today = new Date()): string {
  const cutoff = new Date(today.getFullYear(), today.getMonth() - months, 1);
  const lastDay = new Date(
    cutoff.getFullYear(),
    cutoff.getMonth() + 1,
    0,
  ).getDate();
  cutoff.setDate(Math.min(today.getDate(), lastDay));
  return localDate(cutoff);
}

export function lastWornByItem(
  events: readonly WearEvent[],
): Record<string, string> {
  const dates: Record<string, string> = {};
  for (const event of events) {
    for (const id of event.itemIds) {
      if (!dates[id] || event.wornOn > dates[id]) dates[id] = event.wornOn;
    }
  }
  return dates;
}

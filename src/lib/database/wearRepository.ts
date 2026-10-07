import { invoke } from "@tauri-apps/api/core";

export type WearEvent = {
  id: string;
  wornOn: string;
  outfitId: string | null;
  sourceName: string;
  isOutfit: boolean;
  itemIds: string[];
  createdAt: string;
};

export const wearRepository = {
  list: () => invoke<WearEvent[]>("list_wear_events"),
  record: (targetId: string, isOutfit: boolean, wornOn: string) =>
    invoke<void>("record_wear", {
      id: crypto.randomUUID(),
      targetId,
      isOutfit,
      wornOn,
    }),
  delete: (id: string) => invoke<void>("delete_wear_event", { id }),
};

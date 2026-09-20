import { invoke } from "@tauri-apps/api/core";
import type { NewOutfit, Outfit, OutfitChanges } from "../../types/outfit";

export type OutfitRepository = {
  create(outfit: NewOutfit): Promise<Outfit>;
  get(id: string): Promise<Outfit | null>;
  list(): Promise<Outfit[]>;
  setFavorite(id: string, favorite: boolean): Promise<Outfit>;
  update(id: string, outfit: OutfitChanges): Promise<Outfit>;
  delete(id: string): Promise<boolean>;
  containingItem(clothingItemId: string): Promise<Outfit[]>;
};

export const outfitRepository: OutfitRepository = {
  create(outfit) {
    return invoke("create_outfit", {
      outfit: { ...outfit, id: crypto.randomUUID() },
    });
  },
  get(id) {
    return invoke("get_outfit", { id });
  },
  list() {
    return invoke("list_outfits");
  },
  setFavorite(id, favorite) {
    return invoke("set_outfit_favorite", { id, favorite });
  },
  update(id, outfit) {
    return invoke("update_outfit", { id, outfit });
  },
  delete(id) {
    return invoke("delete_outfit", { id });
  },
  containingItem(clothingItemId) {
    return invoke("list_outfits_containing_item", { clothingItemId });
  },
};

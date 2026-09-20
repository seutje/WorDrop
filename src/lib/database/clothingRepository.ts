import { invoke } from "@tauri-apps/api/core";
import type {
  ClothingItem,
  ClothingItemChanges,
  NewClothingItem,
} from "../../types/clothing";

export type ClothingRepository = {
  create(item: NewClothingItem): Promise<ClothingItem>;
  get(id: string): Promise<ClothingItem | null>;
  list(): Promise<ClothingItem[]>;
  setFavorite(id: string, favorite: boolean): Promise<ClothingItem>;
  update(id: string, item: ClothingItemChanges): Promise<ClothingItem>;
  delete(id: string): Promise<boolean>;
};

export const clothingRepository: ClothingRepository = {
  create(item) {
    return invoke("create_clothing_item", {
      item: { ...item, id: crypto.randomUUID() },
    });
  },
  get(id) {
    return invoke("get_clothing_item", { id });
  },
  list() {
    return invoke("list_clothing_items");
  },
  setFavorite(id, favorite) {
    return invoke("set_clothing_item_favorite", { id, favorite });
  },
  update(id, item) {
    return invoke("update_clothing_item", { id, item });
  },
  delete(id) {
    return invoke("delete_clothing_item", { id });
  },
};

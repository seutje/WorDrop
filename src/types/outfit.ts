export type Outfit = {
  id: string;
  name: string;
  itemIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type NewOutfit = Omit<Outfit, "id" | "createdAt" | "updatedAt">;
export type OutfitChanges = Omit<Outfit, "createdAt" | "updatedAt">;

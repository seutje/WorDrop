export type Outfit = {
  id: string;
  name: string;
  itemIds: string[];
  notes?: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewOutfit = Omit<
  Outfit,
  "id" | "createdAt" | "updatedAt" | "favorite"
> & { favorite?: boolean };
export type OutfitChanges = Omit<Outfit, "createdAt" | "updatedAt">;

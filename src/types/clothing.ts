export const clothingCategories = [
  "top",
  "bottom",
  "dress",
  "shoes",
  "outerwear",
  "accessory",
] as const;

export const clothingColors = [
  "black",
  "white",
  "gray",
  "beige",
  "cream",
  "brown",
  "navy",
  "blue",
  "light-blue",
  "green",
  "olive",
  "red",
  "burgundy",
  "pink",
  "purple",
  "yellow",
  "orange",
  "metallic",
  "multicolor",
] as const;
export const seasons = [
  "spring",
  "summer",
  "autumn",
  "winter",
  "all-season",
] as const;
export const occasions = [
  "casual",
  "work",
  "formal",
  "party",
  "sport",
  "travel",
  "lounge",
  "date",
  "outdoor",
] as const;
export const ownershipStates = ["owned", "wishlist"] as const;

export type ClothingCategory = (typeof clothingCategories)[number];
export type ClothingColor = (typeof clothingColors)[number];
export type Season = (typeof seasons)[number];
export type Occasion = (typeof occasions)[number];
export type Ownership = (typeof ownershipStates)[number];

export type ClothingItem = {
  id: string;
  name: string;
  category: ClothingCategory;
  subtype?: string;
  colors: ClothingColor[];
  material?: string;
  pattern?: string;
  seasons: Season[];
  occasions: Occasion[];
  styleTags: string[];
  ownership: Ownership;
  imagePath: string;
  displayImagePath?: string;
  cropZoom?: number;
  cropX?: number;
  cropY?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type NewClothingItem = Omit<
  ClothingItem,
  "id" | "createdAt" | "updatedAt"
>;
export type ClothingItemChanges = Omit<ClothingItem, "createdAt" | "updatedAt">;

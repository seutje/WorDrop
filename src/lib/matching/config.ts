import type { ClothingCategory, ClothingColor } from "../../types/clothing";
import type { MatchBreakdown } from "./types";

export const MATCH_WEIGHTS: Readonly<MatchBreakdown> = {
  color: 30,
  category: 25,
  occasion: 15,
  season: 15,
  style: 10,
  material: 5,
};

export const NEUTRAL_COLORS = new Set<ClothingColor>([
  "black",
  "white",
  "gray",
  "beige",
  "cream",
  "brown",
  "navy",
]);

export const COLOR_PAIRS: ReadonlyArray<
  readonly [ClothingColor, ClothingColor]
> = [
  ["blue", "orange"],
  ["navy", "cream"],
  ["navy", "light-blue"],
  ["green", "brown"],
  ["olive", "beige"],
  ["olive", "cream"],
  ["red", "navy"],
  ["burgundy", "gray"],
  ["pink", "gray"],
  ["purple", "gray"],
  ["yellow", "navy"],
  ["light-blue", "brown"],
];

export const CATEGORY_COMPATIBILITY: Readonly<
  Record<ClothingCategory, Readonly<Partial<Record<ClothingCategory, number>>>>
> = {
  top: {
    top: 0.35,
    bottom: 1,
    dress: 0.25,
    shoes: 0.85,
    outerwear: 0.95,
    accessory: 0.8,
  },
  bottom: {
    top: 1,
    bottom: 0.35,
    dress: 0.2,
    shoes: 0.9,
    outerwear: 0.8,
    accessory: 0.75,
  },
  dress: {
    top: 0.25,
    bottom: 0.2,
    dress: 0.3,
    shoes: 1,
    outerwear: 0.9,
    accessory: 0.9,
  },
  shoes: {
    top: 0.85,
    bottom: 0.9,
    dress: 1,
    shoes: 0.3,
    outerwear: 0.65,
    accessory: 0.65,
  },
  outerwear: {
    top: 0.95,
    bottom: 0.8,
    dress: 0.9,
    shoes: 0.65,
    outerwear: 0.3,
    accessory: 0.75,
  },
  accessory: {
    top: 0.8,
    bottom: 0.75,
    dress: 0.9,
    shoes: 0.65,
    outerwear: 0.75,
    accessory: 0.65,
  },
};

export const MATERIAL_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["denim", "cotton"],
  ["wool", "leather"],
  ["linen", "cotton"],
  ["silk", "wool"],
  ["suede", "denim"],
  ["knit", "denim"],
  ["cashmere", "wool"],
];

import { describe, expect, it } from "vitest";
import type { ClothingItem } from "../types/clothing";
import { shouldExcludeBottoms } from "./outfitRules";

const item = (
  id: string,
  category: ClothingItem["category"],
): ClothingItem => ({
  id,
  name: id,
  category,
  colors: [],
  seasons: [],
  occasions: [],
  styleTags: [],
  ownership: "owned",
  imagePath: `images/${id}.png`,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

describe("outfit bottom preference", () => {
  const bottom = item("jeans", "bottom");
  const top = item("shirt", "top");

  it("excludes another bottom when adding to an outfit with one", () => {
    expect(shouldExcludeBottoms([bottom, top], null, false)).toBe(true);
  });

  it("allows replacing the existing bottom with another bottom", () => {
    expect(shouldExcludeBottoms([bottom, top], 0, false)).toBe(false);
  });

  it("still excludes bottoms when replacing a top", () => {
    expect(shouldExcludeBottoms([bottom, top], 1, false)).toBe(true);
  });

  it("does not restrict bottoms when the preference is enabled", () => {
    expect(shouldExcludeBottoms([bottom], null, true)).toBe(false);
  });
});

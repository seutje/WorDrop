import { describe, expect, it } from "vitest";
import type { ClothingItem } from "../../types/clothing";
import { scoreOutfit } from "./outfitCompatibility";

function item(id: string, values: Partial<ClothingItem> = {}): ClothingItem {
  return {
    id,
    name: id,
    category: "top",
    colors: [],
    seasons: [],
    occasions: [],
    styleTags: [],
    ownership: "owned",
    favorite: false,
    imagePath: `${id}.jpg`,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...values,
  };
}

describe("scoreOutfit", () => {
  const top = item("top", {
    category: "top",
    colors: ["black"],
    seasons: ["autumn"],
    occasions: ["casual"],
    styleTags: ["classic"],
  });
  const bottom = item("bottom", {
    category: "bottom",
    colors: ["blue"],
    seasons: ["autumn"],
    occasions: ["casual"],
    styleTags: ["classic"],
  });

  it("does not invent confidence for a single item", () => {
    expect(scoreOutfit([top])).toMatchObject({
      status: "insufficient",
      pairs: [],
    });
  });

  it("scores relevant category pairs and returns concise reasons", () => {
    const shoes = item("shoes", {
      category: "shoes",
      colors: ["black"],
      seasons: ["autumn"],
      occasions: ["casual"],
      styleTags: ["classic"],
    });
    const result = scoreOutfit([top, bottom, shoes]);
    expect(result.status).toBe("scored");
    if (result.status !== "scored") return;
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.length).toBeLessThanOrEqual(3);
    expect(result.pairs).toHaveLength(3);
  });

  it("ignores duplicate-category pairs while keeping complementary ones", () => {
    const secondTop = item("second-top", {
      category: "top",
      colors: ["white"],
      seasons: ["autumn"],
      occasions: ["casual"],
    });
    const result = scoreOutfit([top, secondTop, bottom]);
    expect(result.pairs).toHaveLength(2);
    expect(
      result.pairs.some(
        (pair) =>
          pair.leftItemId === "top" && pair.rightItemId === "second-top",
      ),
    ).toBe(false);
  });

  it("suppresses scores when pair metadata is too sparse", () => {
    const sparseTop = item("sparse-top", { category: "top" });
    const sparseBottom = item("sparse-bottom", { category: "bottom" });
    expect(scoreOutfit([sparseTop, sparseBottom])).toMatchObject({
      status: "insufficient",
      pairs: expect.any(Array),
    });
  });

  it("returns advisory language for a low-scoring combination", () => {
    const colorfulTop: ClothingItem = { ...top, colors: ["green"] };
    const clash = item("clash", {
      category: "bottom",
      colors: ["purple"],
      seasons: ["winter"],
      occasions: ["formal"],
      styleTags: ["romantic"],
    });
    const result = scoreOutfit([colorfulTop, clash]);
    expect(result.status).toBe("scored");
    if (result.status !== "scored") return;
    expect(result.summary).toContain("still yours to wear");
  });
});

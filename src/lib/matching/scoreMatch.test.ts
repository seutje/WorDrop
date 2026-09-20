import { describe, expect, it } from "vitest";
import type { ClothingItem } from "../../types/clothing";
import { MATCH_WEIGHTS, rankMatches, scoreMatch } from ".";

function item(id: string, values: Partial<ClothingItem> = {}): ClothingItem {
  return {
    id,
    name: `Item ${id}`,
    category: "top",
    colors: [],
    seasons: [],
    occasions: [],
    styleTags: [],
    ownership: "owned",
    favorite: false,
    imagePath: `images/original/${id}.jpg`,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...values,
  };
}

const blackTop = item("top", {
  category: "top",
  colors: ["black"],
  material: "Cotton",
  seasons: ["summer"],
  occasions: ["casual"],
  styleTags: ["minimalist", "casual"],
});

describe("scoreMatch", () => {
  it("uses centralized weights totaling 100", () => {
    expect(
      Object.values(MATCH_WEIGHTS).reduce((sum, value) => sum + value, 0),
    ).toBe(100);
    const result = scoreMatch(blackTop, item("candidate"));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("rewards complementary categories over weak structural pairs", () => {
    const bottom = item("bottom", { category: "bottom" });
    const dress = item("dress", { category: "dress" });
    expect(scoreMatch(blackTop, bottom).breakdown.category).toBeGreaterThan(
      scoreMatch(blackTop, dress).breakdown.category,
    );
  });

  it("ranks neutral and curated color combinations above unrelated colors", () => {
    const beigeBottom = item("beige", {
      category: "bottom",
      colors: ["beige"],
    });
    const orangeBottom = item("orange", {
      category: "bottom",
      colors: ["orange"],
    });
    const purpleBottom = item("purple", {
      category: "bottom",
      colors: ["purple"],
    });
    const blueTop = item("blue-top", { colors: ["blue"] });
    expect(scoreMatch(blackTop, beigeBottom).breakdown.color).toBeGreaterThan(
      scoreMatch(blueTop, purpleBottom).breakdown.color,
    );
    expect(scoreMatch(blackTop, beigeBottom).score).toBeGreaterThanOrEqual(70);
    expect(scoreMatch(blueTop, orangeBottom).breakdown.color).toBeGreaterThan(
      scoreMatch(blueTop, purpleBottom).breakdown.color,
    );
  });

  it("supports multi-color items and exact color overlap", () => {
    const candidate = item("multi", { colors: ["red", "black"] });
    const result = scoreMatch(blackTop, candidate);
    expect(result.breakdown.color).toBe(MATCH_WEIGHTS.color);
    expect(result.reasons).toContain("Their colors create a cohesive palette.");
  });

  it("penalizes incompatible seasons while all-season overlaps", () => {
    const winter = item("winter", { seasons: ["winter"] });
    const allSeason = item("all", { seasons: ["all-season"] });
    expect(scoreMatch(blackTop, allSeason).breakdown.season).toBe(
      MATCH_WEIGHTS.season,
    );
    expect(scoreMatch(blackTop, winter).breakdown.season).toBeLessThan(
      scoreMatch(blackTop, allSeason).breakdown.season,
    );
  });

  it("rewards shared occasions and case-insensitive style overlap", () => {
    const shared = item("shared", {
      occasions: ["casual"],
      styleTags: ["Minimalist"],
    });
    const unrelated = item("other", {
      occasions: ["formal"],
      styleTags: ["romantic"],
    });
    const sharedResult = scoreMatch(blackTop, shared);
    const unrelatedResult = scoreMatch(blackTop, unrelated);
    expect(sharedResult.breakdown.occasion).toBeGreaterThan(
      unrelatedResult.breakdown.occasion,
    );
    expect(sharedResult.breakdown.style).toBeGreaterThan(
      unrelatedResult.breakdown.style,
    );
  });

  it("keeps material low-weight while recognizing curated pairs", () => {
    const denim = item("denim", { material: "Denim" });
    const polyester = item("poly", { material: "Polyester" });
    expect(scoreMatch(blackTop, denim).breakdown.material).toBeGreaterThan(
      scoreMatch(blackTop, polyester).breakdown.material,
    );
    expect(scoreMatch(blackTop, denim).breakdown.material).toBeLessThanOrEqual(
      MATCH_WEIGHTS.material,
    );
  });

  it("treats missing optional metadata neutrally rather than as zero", () => {
    const sparseLeft = item("sparse-left", { category: "top" });
    const sparseRight = item("sparse-right", { category: "bottom" });
    const result = scoreMatch(sparseLeft, sparseRight);
    expect(result.breakdown.color).toBeGreaterThan(0);
    expect(result.breakdown.season).toBeGreaterThan(0);
    expect(result.breakdown.occasion).toBeGreaterThan(0);
    expect(result.breakdown.style).toBeGreaterThan(0);
    expect(result.breakdown.material).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(50);
  });

  it("returns at most three human-readable positive reasons", () => {
    const match = item("match", {
      category: "bottom",
      colors: ["black"],
      material: "Denim",
      seasons: ["summer"],
      occasions: ["casual"],
      styleTags: ["casual"],
    });
    const result = scoreMatch(blackTop, match);
    expect(result.reasons).toHaveLength(3);
    expect(result.reasons.every((reason) => reason.endsWith("."))).toBe(true);
  });

  it("is deterministic, excludes self, and uses ID as a stable tie-breaker", () => {
    const candidateB = item("b", { category: "bottom" });
    const candidateA = item("a", { category: "bottom" });
    const first = rankMatches(blackTop, [candidateB, blackTop, candidateA]);
    const second = rankMatches(blackTop, [candidateB, blackTop, candidateA]);
    expect(first).toEqual(second);
    expect(first.map(({ itemId }) => itemId)).toEqual(["a", "b"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  canApplyCategorySuggestion,
  canApplySubtypeSuggestion,
  suggestWearMetadata,
} from "./imageClassification";

describe("category suggestion lifecycle", () => {
  it("applies only the current result before the user edits category", () => {
    expect(canApplyCategorySuggestion(2, 2, false, "shoes")).toBe(true);
    expect(canApplyCategorySuggestion(1, 2, false, "shoes")).toBe(false);
    expect(canApplyCategorySuggestion(2, 2, true, "shoes")).toBe(false);
    expect(canApplyCategorySuggestion(2, 2, false, undefined)).toBe(false);
    expect(canApplyCategorySuggestion(2, 2, false, null)).toBe(false);
  });

  it("protects subtype edits, clearing, and newer image requests", () => {
    expect(canApplySubtypeSuggestion(3, 3, true, false, "T-shirt")).toBe(true);
    expect(canApplySubtypeSuggestion(2, 3, true, false, "T-shirt")).toBe(false);
    expect(canApplySubtypeSuggestion(3, 3, false, false, "T-shirt")).toBe(
      false,
    );
    expect(canApplySubtypeSuggestion(3, 3, true, true, "T-shirt")).toBe(false);
    expect(canApplySubtypeSuggestion(3, 3, true, false, undefined)).toBe(false);
    expect(canApplySubtypeSuggestion(3, 3, true, false, null)).toBe(false);
  });
});

describe("editable season and occasion defaults", () => {
  it("suggests warm weather and casual wear for a T-shirt", () => {
    expect(suggestWearMetadata("top", "T-shirt")).toEqual({
      seasons: ["spring", "summer"],
      occasions: ["casual"],
    });
  });
  it("distinguishes long sleeves, winter layers, and athletic clothing", () => {
    expect(suggestWearMetadata("top", "Long-sleeve T-shirt").seasons).toEqual([
      "all-season",
    ]);
    expect(suggestWearMetadata("outerwear", "Parka").seasons).toEqual([
      "autumn",
      "winter",
    ]);
    expect(suggestWearMetadata("shoes", "Running shoes").occasions).toEqual([
      "sport",
    ]);
    expect(suggestWearMetadata("dress", "Cocktail dress").occasions).toEqual([
      "formal",
      "party",
    ]);
  });
  it("provides at least one valid option for unrecognized or missing subtypes", () => {
    expect(suggestWearMetadata("accessory", "Custom scarf")).toEqual({
      seasons: ["all-season"],
      occasions: ["casual"],
    });
    expect(suggestWearMetadata("top")).toEqual({
      seasons: ["all-season"],
      occasions: ["casual"],
    });
  });
});

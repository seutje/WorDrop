import { describe, expect, it } from "vitest";
import {
  canApplyCategorySuggestion,
  canApplySubtypeSuggestion,
} from "./imageClassification";

describe("category suggestion lifecycle", () => {
  it("applies only the current result before the user edits category", () => {
    expect(canApplyCategorySuggestion(2, 2, false, "shoes")).toBe(true);
    expect(canApplyCategorySuggestion(1, 2, false, "shoes")).toBe(false);
    expect(canApplyCategorySuggestion(2, 2, true, "shoes")).toBe(false);
    expect(canApplyCategorySuggestion(2, 2, false, undefined)).toBe(false);
  });

  it("protects subtype edits, clearing, and newer image requests", () => {
    expect(canApplySubtypeSuggestion(3, 3, false, false, "T-shirt")).toBe(true);
    expect(canApplySubtypeSuggestion(2, 3, false, false, "T-shirt")).toBe(
      false,
    );
    expect(canApplySubtypeSuggestion(3, 3, true, false, "T-shirt")).toBe(false);
    expect(canApplySubtypeSuggestion(3, 3, false, true, "T-shirt")).toBe(false);
    expect(canApplySubtypeSuggestion(3, 3, false, false, undefined)).toBe(
      false,
    );
  });
});

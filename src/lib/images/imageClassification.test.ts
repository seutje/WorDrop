import { describe, expect, it } from "vitest";
import { canApplyCategorySuggestion } from "./imageClassification";

describe("category suggestion lifecycle", () => {
  it("applies only the current result before the user edits category", () => {
    expect(canApplyCategorySuggestion(2, 2, false, "shoes")).toBe(true);
    expect(canApplyCategorySuggestion(1, 2, false, "shoes")).toBe(false);
    expect(canApplyCategorySuggestion(2, 2, true, "shoes")).toBe(false);
    expect(canApplyCategorySuggestion(2, 2, false, undefined)).toBe(false);
  });
});

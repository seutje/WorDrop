import { invoke } from "@tauri-apps/api/core";
import type {
  ClothingCategory,
  ClothingColor,
  Occasion,
  Season,
} from "../../types/clothing";

/** Editable wardrobe defaults, derived locally rather than claimed as model predictions. */
export function suggestWearMetadata(
  category: ClothingCategory,
  subtype?: string | null,
): {
  seasons: Season[];
  occasions: Occasion[];
} {
  const label = subtype?.toLowerCase() ?? "";
  const warmWeather = [
    "t-shirt",
    "tank top",
    "camisole",
    "crop top",
    "shorts",
    "denim shorts",
    "cargo shorts",
    "romper",
    "sandals",
    "flip-flops",
    "swimwear",
  ].includes(label);
  const coldWeather = [
    "sweater",
    "sweater dress",
    "parka",
    "winter coat",
    "puffer jacket",
  ].includes(label);
  return {
    seasons: warmWeather
      ? ["spring", "summer"]
      : coldWeather
        ? ["autumn", "winter"]
        : ["all-season"],
    occasions: ["jersey", "running shoes", "sports bra", "swimwear"].includes(
      label,
    )
      ? ["sport"]
      : category === "dress" &&
          ["evening dress", "cocktail dress"].includes(label)
        ? ["formal", "party"]
        : ["casual"],
  };
}

export type CategoryPrediction = {
  category: ClothingCategory;
  score: number;
};

export type ClassificationTiming = {
  sessionInitializationMs: number;
  imageDecodePreprocessingMs: number;
  modelInferenceMs: number;
  categoryScoringMs: number;
  subtypeScoringMs: number;
  scoringMs: number;
  totalMs: number;
};

export type ImageClassificationResult = {
  predictions: CategoryPrediction[];
  suggestedCategory?: ClothingCategory | null;
  confidenceScore: number;
  topTwoMargin: number;
  subtypePredictions: Array<{
    subtype: string;
    category: ClothingCategory;
    score: number;
  }>;
  suggestedSubtype?: string | null;
  suggestedColors?: ClothingColor[];
  fallbackUsed?: boolean;
  subtypeConfidenceScore?: number;
  subtypeTopTwoMargin?: number;
  timing: ClassificationTiming;
};

export function classifyManagedImage(
  reference: string,
): Promise<ImageClassificationResult> {
  return invoke("classify_clothing_image", { reference });
}

export function canApplySubtypeSuggestion(
  completedRequest: number,
  currentRequest: number,
  categoryMatchesSuggestion: boolean,
  subtypeWasEdited: boolean,
  suggestedSubtype?: string | null,
): suggestedSubtype is string {
  return (
    completedRequest === currentRequest &&
    categoryMatchesSuggestion &&
    !subtypeWasEdited &&
    suggestedSubtype != null
  );
}

export function canApplyCategorySuggestion(
  completedRequest: number,
  currentRequest: number,
  categoryWasEdited: boolean,
  suggestedCategory?: ClothingCategory | null,
): suggestedCategory is ClothingCategory {
  return (
    completedRequest === currentRequest &&
    !categoryWasEdited &&
    suggestedCategory != null
  );
}

import { invoke } from "@tauri-apps/api/core";
import type { ClothingCategory } from "../../types/clothing";

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
  suggestedCategory?: ClothingCategory;
  confidenceScore: number;
  topTwoMargin: number;
  subtypePredictions: Array<{
    subtype: string;
    category: ClothingCategory;
    score: number;
  }>;
  suggestedSubtype?: string;
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
  categoryWasEdited: boolean,
  subtypeWasEdited: boolean,
  suggestedSubtype?: string,
): suggestedSubtype is string {
  return (
    completedRequest === currentRequest &&
    !categoryWasEdited &&
    !subtypeWasEdited &&
    suggestedSubtype !== undefined
  );
}

export function canApplyCategorySuggestion(
  completedRequest: number,
  currentRequest: number,
  categoryWasEdited: boolean,
  suggestedCategory?: ClothingCategory,
): suggestedCategory is ClothingCategory {
  return (
    completedRequest === currentRequest &&
    !categoryWasEdited &&
    suggestedCategory !== undefined
  );
}

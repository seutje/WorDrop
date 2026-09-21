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
  scoringMs: number;
  totalMs: number;
};

export type ImageClassificationResult = {
  predictions: CategoryPrediction[];
  suggestedCategory?: ClothingCategory;
  confidenceScore: number;
  topTwoMargin: number;
  timing: ClassificationTiming;
};

export function classifyManagedImage(
  reference: string,
): Promise<ImageClassificationResult> {
  return invoke("classify_clothing_image", { reference });
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

import type { ClothingCategory, ClothingItem } from "../../types/clothing";
import { scoreMatch } from "./scoreMatch";
import type { MatchResult } from "./types";

export type OutfitPairResult = {
  leftItemId: string;
  rightItemId: string;
  result: MatchResult;
};

export type OutfitCompatibility =
  | {
      status: "insufficient";
      message: string;
      pairs: OutfitPairResult[];
    }
  | {
      status: "scored";
      score: number;
      label: string;
      summary: string;
      reasons: string[];
      pairs: OutfitPairResult[];
    };

const relevantCategoryPairs = new Set([
  "bottom|shoes",
  "bottom|top",
  "bottom|outerwear",
  "dress|shoes",
  "dress|outerwear",
  "outerwear|shoes",
  "outerwear|top",
  "shoes|top",
]);

function categoriesAreRelevant(
  left: ClothingCategory,
  right: ClothingCategory,
) {
  if (left === "accessory" || right === "accessory") return left !== right;
  return relevantCategoryPairs.has([left, right].sort().join("|"));
}

function sharedMetadataCount(left: ClothingItem, right: ClothingItem) {
  return [
    left.colors.length > 0 && right.colors.length > 0,
    left.seasons.length > 0 && right.seasons.length > 0,
    left.occasions.length > 0 && right.occasions.length > 0,
    left.styleTags.length > 0 && right.styleTags.length > 0,
    Boolean(left.material && right.material),
  ].filter(Boolean).length;
}

function scoreLabel(score: number) {
  if (score >= 80) return "Great match";
  if (score >= 65) return "Looks cohesive";
  if (score >= 50) return "Worth a look";
  return "Try another balance";
}

export function scoreOutfit(
  items: readonly ClothingItem[],
): OutfitCompatibility {
  if (items.length < 2)
    return {
      status: "insufficient",
      message: "Add another item to see outfit compatibility.",
      pairs: [],
    };

  const pairs: OutfitPairResult[] = [];
  let metadataCount = 0;
  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < items.length;
      rightIndex += 1
    ) {
      const left = items[leftIndex];
      const right = items[rightIndex];
      if (!categoriesAreRelevant(left.category, right.category)) continue;
      metadataCount += sharedMetadataCount(left, right);
      pairs.push({
        leftItemId: left.id,
        rightItemId: right.id,
        result: scoreMatch(left, right),
      });
    }
  }

  if (!pairs.length)
    return {
      status: "insufficient",
      message:
        "Add a complementary category, such as shoes or a top, for useful feedback.",
      pairs,
    };
  if (metadataCount < pairs.length * 2)
    return {
      status: "insufficient",
      message:
        "Add more colors, seasons, occasions, or style details for useful feedback.",
      pairs,
    };

  const score = Math.round(
    pairs.reduce((sum, pair) => sum + pair.result.score, 0) / pairs.length,
  );
  const reasonCounts = new Map<string, number>();
  for (const pair of pairs)
    for (const reason of pair.result.reasons)
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  const reasons = [...reasonCounts]
    .sort(([leftReason, leftCount], [rightReason, rightCount]) =>
      rightCount === leftCount
        ? leftReason.localeCompare(rightReason)
        : rightCount - leftCount,
    )
    .slice(0, 3)
    .map(([reason]) => reason);

  return {
    status: "scored",
    score,
    label: scoreLabel(score),
    summary:
      score >= 65
        ? "These pieces share several compatible qualities."
        : "This combination is still yours to wear—consider the suggestions below if you want to refine it.",
    reasons,
    pairs,
  };
}

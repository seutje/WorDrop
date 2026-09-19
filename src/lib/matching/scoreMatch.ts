import type { ClothingItem } from "../../types/clothing";
import {
  CATEGORY_COMPATIBILITY,
  COLOR_PAIRS,
  MATCH_WEIGHTS,
  MATERIAL_PAIRS,
  NEUTRAL_COLORS,
} from "./config";
import type { MatchBreakdown, MatchComponent, MatchResult } from "./types";

type ComponentResult = { factor: number; reason?: string };
const pairMatches = <T>(
  pairs: ReadonlyArray<readonly [T, T]>,
  left: T,
  right: T,
) =>
  pairs.some(
    ([a, b]) => (a === left && b === right) || (a === right && b === left),
  );
const overlaps = <T>(left: readonly T[], right: readonly T[]) =>
  left.some((value) => right.includes(value));

function scoreCategory(
  left: ClothingItem,
  right: ClothingItem,
): ComponentResult {
  const factor = CATEGORY_COMPATIBILITY[left.category][right.category] ?? 0.5;
  return {
    factor,
    reason:
      factor >= 0.8 ? "These categories commonly work together." : undefined,
  };
}

function scoreColor(left: ClothingItem, right: ClothingItem): ComponentResult {
  if (!left.colors.length || !right.colors.length) return { factor: 0.65 };
  if (overlaps(left.colors, right.colors))
    return { factor: 1, reason: "Their colors create a cohesive palette." };
  if (
    left.colors.some((color) => NEUTRAL_COLORS.has(color)) ||
    right.colors.some((color) => NEUTRAL_COLORS.has(color))
  )
    return { factor: 0.9, reason: "Neutral colors pair easily." };
  if (
    left.colors.some((a) =>
      right.colors.some((b) => pairMatches(COLOR_PAIRS, a, b)),
    )
  )
    return {
      factor: 0.85,
      reason: "Their colors are a complementary pairing.",
    };
  if (left.colors.includes("multicolor") || right.colors.includes("multicolor"))
    return { factor: 0.6 };
  return { factor: 0.4 };
}

function scoreSeason(left: ClothingItem, right: ClothingItem): ComponentResult {
  if (!left.seasons.length || !right.seasons.length) return { factor: 0.65 };
  if (
    left.seasons.includes("all-season") ||
    right.seasons.includes("all-season")
  )
    return { factor: 1, reason: "They work in the same seasons." };
  if (overlaps(left.seasons, right.seasons))
    return { factor: 1, reason: "They work in the same seasons." };
  return { factor: 0.2 };
}

function scoreOccasion(
  left: ClothingItem,
  right: ClothingItem,
): ComponentResult {
  if (!left.occasions.length || !right.occasions.length)
    return { factor: 0.65 };
  if (overlaps(left.occasions, right.occasions))
    return { factor: 1, reason: "They suit the same occasions." };
  return { factor: 0.3 };
}

function scoreStyle(left: ClothingItem, right: ClothingItem): ComponentResult {
  if (!left.styleTags.length || !right.styleTags.length)
    return { factor: 0.65 };
  const normalizedRight = right.styleTags.map((tag) =>
    tag.trim().toLocaleLowerCase(),
  );
  const shared = left.styleTags.some((tag) =>
    normalizedRight.includes(tag.trim().toLocaleLowerCase()),
  );
  return shared
    ? { factor: 1, reason: "Their style tags overlap." }
    : { factor: 0.45 };
}

function scoreMaterial(
  left: ClothingItem,
  right: ClothingItem,
): ComponentResult {
  if (!left.material || !right.material) return { factor: 0.65 };
  const a = left.material.trim().toLocaleLowerCase();
  const b = right.material.trim().toLocaleLowerCase();
  if (a === b)
    return { factor: 0.9, reason: "Their materials have a consistent feel." };
  if (pairMatches(MATERIAL_PAIRS, a, b))
    return { factor: 0.9, reason: "Their materials work well together." };
  return { factor: 0.55 };
}

const scorers: Readonly<
  Record<
    MatchComponent,
    (left: ClothingItem, right: ClothingItem) => ComponentResult
  >
> = {
  color: scoreColor,
  category: scoreCategory,
  occasion: scoreOccasion,
  season: scoreSeason,
  style: scoreStyle,
  material: scoreMaterial,
};

export function scoreMatch(
  selected: ClothingItem,
  candidate: ClothingItem,
): MatchResult {
  const breakdown = {} as MatchBreakdown;
  const positiveReasons: Array<{ contribution: number; reason: string }> = [];
  for (const component of Object.keys(MATCH_WEIGHTS) as MatchComponent[]) {
    const result = scorers[component](selected, candidate);
    const contribution = MATCH_WEIGHTS[component] * result.factor;
    breakdown[component] = Math.round(contribution * 10) / 10;
    if (result.reason)
      positiveReasons.push({ contribution, reason: result.reason });
  }
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Object.values(breakdown).reduce((sum, value) => sum + value, 0),
      ),
    ),
  );
  const reasons = positiveReasons
    .sort(
      (a, b) =>
        b.contribution - a.contribution || a.reason.localeCompare(b.reason),
    )
    .slice(0, 3)
    .map(({ reason }) => reason);
  if (!reasons.length)
    reasons.push("This combination may still be worth trying.");
  return { itemId: candidate.id, score, reasons, breakdown };
}

export function rankMatches(
  selected: ClothingItem,
  candidates: readonly ClothingItem[],
): MatchResult[] {
  return candidates
    .filter((candidate) => candidate.id !== selected.id)
    .map((candidate) => scoreMatch(selected, candidate))
    .sort((a, b) => b.score - a.score || a.itemId.localeCompare(b.itemId));
}

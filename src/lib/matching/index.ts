export { MATCH_WEIGHTS } from "./config";
export { rankMatches, scoreMatch } from "./scoreMatch";
export { scoreOutfit } from "./outfitCompatibility";
export type {
  OutfitCompatibility,
  OutfitPairResult,
} from "./outfitCompatibility";
export {
  COMPATIBLE_WISHLIST_MATCH_SCORE,
  evaluateWishlistIntegration,
  STRONG_WISHLIST_MATCH_SCORE,
} from "./wishlistIntegration";
export type { WishlistIntegration, WishlistMatch } from "./wishlistIntegration";
export type { MatchBreakdown, MatchResult } from "./types";

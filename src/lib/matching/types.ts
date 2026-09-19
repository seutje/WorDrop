export type MatchBreakdown = {
  color: number;
  category: number;
  occasion: number;
  season: number;
  style: number;
  material: number;
};

export type MatchResult = {
  itemId: string;
  score: number;
  reasons: string[];
  breakdown: MatchBreakdown;
};

export type MatchComponent = keyof MatchBreakdown;

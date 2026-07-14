export interface ParsedPick {
  sport: "nfl" | "nba" | "mlb" | "nhl" | "soccer" | "other";
  league: string | null;
  away_team: string | null;
  home_team: string | null;
  event_hint: string | null;
  market: "spread" | "moneyline" | "total" | "other";
  side: string;
  line: number | null;
  odds_american: number | null;
  units: number;
  units_assumed: boolean;
  stake_convention: "risk" | "to_win";
  ml_variant: "three_way" | "two_way" | "draw_no_bet" | null;
  gradeable: boolean;
  confidence: number;
  quote: string;
}

export interface ParseResponse {
  picks: ParsedPick[];
  no_picks_reason: string | null;
}

export interface ParseImage {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  base64Data: string;
}

export interface ParseInput {
  text: string;
  images?: ParseImage[];
  /** Last ~20 picks' sports for this capper, to help disambiguate ("Utah" -> NBA vs NHL). */
  capperSportTendencies?: string[];
}

export interface ParseUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ParseResult {
  response: ParseResponse;
  usages: ParseUsage[]; // one entry per model call made (haiku, +sonnet if escalated)
  escalated: boolean;
}

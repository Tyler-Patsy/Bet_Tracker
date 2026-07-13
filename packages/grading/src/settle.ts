export type Market = "spread" | "moneyline" | "total" | "other";
export type MlVariant = "three_way" | "two_way" | "draw_no_bet" | null;

export interface SettleInput {
  market: Market;
  side: string;
  line: number | null;
  mlVariant: MlVariant;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export type SettleOutcome = "win" | "loss" | "push";

function normalizeTeam(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sideIsHome(side: string, homeTeam: string, awayTeam: string): boolean {
  const s = normalizeTeam(side);
  const h = normalizeTeam(homeTeam);
  const a = normalizeTeam(awayTeam);
  const homeMatch = h.includes(s) || s.includes(h);
  const awayMatch = a.includes(s) || s.includes(a);
  if (homeMatch && !awayMatch) return true;
  if (awayMatch && !homeMatch) return false;
  throw new Error(
    `Could not unambiguously match side "${side}" to home (${homeTeam}) or away (${awayTeam})`
  );
}

export function settle(input: SettleInput): SettleOutcome {
  const { market, side, line, mlVariant, homeTeam, awayTeam, homeScore, awayScore } = input;

  if (market === "total") {
    if (line == null) throw new Error("Total pick missing line");
    const sum = homeScore + awayScore;
    const normalizedSide = side.toLowerCase().trim();
    if (normalizedSide !== "over" && normalizedSide !== "under") {
      throw new Error(`Total pick side must be over/under, got "${side}"`);
    }
    if (sum === line) return "push";
    const overWins = sum > line;
    return overWins === (normalizedSide === "over") ? "win" : "loss";
  }

  if (market === "spread") {
    if (line == null) throw new Error("Spread pick missing line");
    const isHome = sideIsHome(side, homeTeam, awayTeam);
    const sideScore = isHome ? homeScore : awayScore;
    const oppScore = isHome ? awayScore : homeScore;
    const adjusted = sideScore - oppScore + line;
    if (adjusted === 0) return "push";
    return adjusted > 0 ? "win" : "loss";
  }

  if (market === "moneyline") {
    const isHome = sideIsHome(side, homeTeam, awayTeam);
    if (homeScore === awayScore) {
      return mlVariant === "draw_no_bet" ? "push" : "loss";
    }
    const homeWon = homeScore > awayScore;
    const sideWon = isHome ? homeWon : !homeWon;
    return sideWon ? "win" : "loss";
  }

  throw new Error(`Cannot auto-settle market "${market}"`);
}

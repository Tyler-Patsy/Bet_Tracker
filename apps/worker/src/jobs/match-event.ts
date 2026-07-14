import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db, events, teamAliases } from "@graded/db";

const DAY_MS = 24 * 60 * 60 * 1000;

const SPORT_TO_LEAGUES: Record<string, string[]> = {
  nfl: ["NFL"],
  nba: ["NBA"],
  mlb: ["MLB"],
  nhl: ["NHL"],
  soccer: ["EPL", "LALIGA", "UCL", "MLS"],
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export interface MatchInput {
  sport: string;
  league: string | null;
  awayTeamRaw: string | null;
  homeTeamRaw: string | null;
  postedAt: Date;
}

export type EventRow = typeof events.$inferSelect;

export type MatchResult =
  | { status: "matched"; event: EventRow }
  | { status: "ambiguous"; candidates: EventRow[] };

async function resolveCanonicalNames(raw: string | null, leagues: string[]): Promise<string[]> {
  if (!raw) return [];
  const normalized = normalize(raw);
  const rows = await db
    .select()
    .from(teamAliases)
    .where(inArray(teamAliases.league, leagues));
  const matches = rows.filter((r) => normalize(r.alias) === normalized);
  return [...new Set(matches.map((m) => m.canonicalName))];
}

// §10.3: fuzzy-match a parsed pick's team names to a real event. Exactly one
// candidate after filtering -> auto-link. Zero or multiple -> ambiguous, left
// for /admin/match (or the review queue) to resolve with a human pick.
export async function matchEvent(input: MatchInput): Promise<MatchResult> {
  const leagues = input.league ? [input.league] : SPORT_TO_LEAGUES[input.sport] ?? [];

  const [awayNames, homeNames] = await Promise.all([
    resolveCanonicalNames(input.awayTeamRaw, leagues),
    resolveCanonicalNames(input.homeTeamRaw, leagues),
  ]);

  const windowStart = new Date(input.postedAt.getTime() - DAY_MS);
  const windowEnd = new Date(input.postedAt.getTime() + DAY_MS);

  const candidates = await db
    .select()
    .from(events)
    .where(
      and(eq(events.sport, input.sport), gte(events.startAt, windowStart), lte(events.startAt, windowEnd))
    );

  let filtered = candidates;
  if (awayNames.length > 0 || homeNames.length > 0) {
    filtered = candidates.filter((ev) => {
      const matchesAway = awayNames.includes(ev.awayTeam) || homeNames.includes(ev.homeTeam);
      const matchesHome = awayNames.includes(ev.homeTeam) || homeNames.includes(ev.awayTeam);
      return matchesAway || matchesHome;
    });
  }

  if (filtered.length === 1) {
    return { status: "matched", event: filtered[0] };
  }
  return { status: "ambiguous", candidates: filtered.slice(0, 20) };
}

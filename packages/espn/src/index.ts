// The ONLY module that talks to ESPN (BUILD_SPEC.md §11). Endpoints are
// unofficial and can change shape without notice — every place that reads
// the response is defensive and throws rather than silently grading on
// partial data (§11: "Never silently grade on partial data").

export type EventStatus = "scheduled" | "in_progress" | "final" | "postponed" | "canceled";

export interface EspnGame {
  providerId: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbrev: string | null;
  awayAbbrev: string | null;
  startAt: Date;
  status: EventStatus;
  homeScore: number | null;
  awayScore: number | null;
  raw: unknown;
}

export const LEAGUES = {
  nfl: { sport: "nfl", league: "NFL", path: "football/nfl" },
  nba: { sport: "nba", league: "NBA", path: "basketball/nba" },
  mlb: { sport: "mlb", league: "MLB", path: "baseball/mlb" },
  nhl: { sport: "nhl", league: "NHL", path: "hockey/nhl" },
  epl: { sport: "soccer", league: "EPL", path: "soccer/eng.1" },
  laliga: { sport: "soccer", league: "LALIGA", path: "soccer/esp.1" },
  ucl: { sport: "soccer", league: "UCL", path: "soccer/uefa.champions" },
  mls: { sport: "soccer", league: "MLS", path: "soccer/usa.1" },
} as const;

export type LeagueKey = keyof typeof LEAGUES;

export function formatDateYYYYMMDD(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function scoreboardUrl(leagueKey: LeagueKey, date: Date): string {
  const cfg = LEAGUES[leagueKey];
  return `https://site.api.espn.com/apis/site/v2/sports/${cfg.path}/scoreboard?dates=${formatDateYYYYMMDD(date)}`;
}

export async function fetchScoreboard(leagueKey: LeagueKey, date: Date): Promise<EspnGame[]> {
  const url = scoreboardUrl(leagueKey, date);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN ${leagueKey} scoreboard request failed: HTTP ${res.status}`);
  }
  const json = await res.json();
  return parseScoreboard(json, leagueKey);
}

export function parseScoreboard(json: unknown, leagueKey: LeagueKey): EspnGame[] {
  const cfg = LEAGUES[leagueKey];
  const obj = json as { events?: unknown };
  if (!Array.isArray(obj?.events)) {
    throw new Error(
      `Unexpected ESPN response shape for ${leagueKey}: missing "events" array. ` +
        "ESPN may have changed their API — do not grade against this response."
    );
  }
  return obj.events.map((ev) => parseEvent(ev, cfg.sport, cfg.league));
}

function parseEvent(ev: unknown, sport: string, league: string): EspnGame {
  const e = ev as {
    id?: string;
    date?: string;
    competitions?: Array<{
      status?: unknown;
      competitors?: Array<{
        homeAway?: string;
        score?: string;
        team?: { displayName?: string; abbreviation?: string };
      }>;
    }>;
  };

  if (!e?.id || !e?.date) {
    throw new Error("Unexpected ESPN event shape: missing id/date");
  }
  const comp = e.competitions?.[0];
  if (!comp) {
    throw new Error(`Unexpected ESPN event shape for event ${e.id}: missing competitions[0]`);
  }
  const competitors = comp.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home?.team?.displayName || !away?.team?.displayName) {
    throw new Error(`Unexpected ESPN competitors shape for event ${e.id}`);
  }

  return {
    providerId: e.id,
    sport,
    league,
    homeTeam: home.team.displayName,
    awayTeam: away.team.displayName,
    homeAbbrev: home.team.abbreviation ?? null,
    awayAbbrev: away.team.abbreviation ?? null,
    startAt: new Date(e.date),
    status: mapStatus(comp.status, e.id),
    homeScore: home.score != null ? Number(home.score) : null,
    awayScore: away.score != null ? Number(away.score) : null,
    raw: ev,
  };
}

function mapStatus(status: unknown, eventId: string): EventStatus {
  const s = status as { type?: { name?: string; state?: string; completed?: boolean } };
  const type = s?.type;
  if (!type) {
    throw new Error(`Unexpected ESPN status shape for event ${eventId}: missing status.type`);
  }
  const name = String(type.name ?? "").toUpperCase();
  if (name.includes("POSTPONED")) return "postponed";
  if (name.includes("CANCEL") || name.includes("ABANDON") || name.includes("SUSPEND")) {
    return "canceled";
  }
  if (type.completed) return "final";
  if (type.state === "pre") return "scheduled";
  return "in_progress";
}

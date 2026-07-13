import { db, events } from "@graded/db";
import { LEAGUES, fetchScoreboard, type LeagueKey, type EspnGame } from "@graded/espn";
import type { Logger } from "pino";

async function upsertGame(game: EspnGame) {
  await db
    .insert(events)
    .values({
      provider: "espn",
      providerId: game.providerId,
      sport: game.sport,
      league: game.league,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeAbbrev: game.homeAbbrev,
      awayAbbrev: game.awayAbbrev,
      startAt: game.startAt,
      status: game.status,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      raw: game.raw,
    })
    .onConflictDoUpdate({
      target: [events.provider, events.providerId],
      set: {
        status: game.status,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        raw: game.raw,
        startAt: game.startAt,
      },
    });
}

// Upserts events for every tracked league across the given dates.
// Used by the 06:00 ET daily-schedule job (today + tomorrow) and available
// for manual backfill of a specific date range.
export async function syncEvents(dates: Date[], log: Logger) {
  const leagueKeys = Object.keys(LEAGUES) as LeagueKey[];
  let total = 0;
  for (const leagueKey of leagueKeys) {
    for (const date of dates) {
      try {
        const games = await fetchScoreboard(leagueKey, date);
        for (const game of games) {
          await upsertGame(game);
        }
        total += games.length;
      } catch (err) {
        log.error({ err, leagueKey, date: date.toISOString() }, "ESPN sync failed for league/date");
      }
    }
  }
  log.info({ total }, "daily-schedule sync complete");
  return total;
}

export function todayAndTomorrow(): Date[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(now.getUTCDate() + 1);
  return [now, tomorrow];
}

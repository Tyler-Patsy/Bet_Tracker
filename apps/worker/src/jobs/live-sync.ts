import { and, eq, gte, lte, notInArray } from "drizzle-orm";
import { db, events } from "@graded/db";
import { LEAGUES, fetchScoreboard, type LeagueKey } from "@graded/espn";
import type PgBoss from "pg-boss";
import type { Logger } from "pino";

const WINDOW_BEFORE_MS = 60 * 60 * 1000; // 1h — games that recently started
const WINDOW_AFTER_MS = 8 * 60 * 60 * 1000; // 8h — games starting soon
const TERMINAL_STATUSES = ["final", "postponed", "canceled"] as const;

function reverseLeagueKey(sport: string, league: string): LeagueKey | null {
  for (const [key, cfg] of Object.entries(LEAGUES)) {
    if (cfg.sport === sport && cfg.league === league) return key as LeagueKey;
  }
  return null;
}

function dateKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Runs every 10 minutes but only actually calls ESPN when some tracked
// event's start time falls in the [-1h, +8h] window (BUILD_SPEC.md §11) —
// most 10-minute ticks on a quiet day are a single cheap DB query and nothing else.
export async function liveSync(boss: PgBoss, log: Logger) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_BEFORE_MS);
  const windowEnd = new Date(now.getTime() + WINDOW_AFTER_MS);

  const candidates = await db
    .select()
    .from(events)
    .where(
      and(
        gte(events.startAt, windowStart),
        lte(events.startAt, windowEnd),
        notInArray(events.status, [...TERMINAL_STATUSES])
      )
    );

  if (candidates.length === 0) {
    log.debug("live-sync: no events in window, skipping ESPN fetch");
    return;
  }

  const toFetch = new Map<string, { leagueKey: LeagueKey; date: Date }>();
  for (const ev of candidates) {
    const leagueKey = reverseLeagueKey(ev.sport, ev.league);
    if (!leagueKey) continue;
    const key = `${leagueKey}:${dateKeyUTC(ev.startAt)}`;
    if (!toFetch.has(key)) toFetch.set(key, { leagueKey, date: ev.startAt });
  }

  for (const { leagueKey, date } of toFetch.values()) {
    try {
      const games = await fetchScoreboard(leagueKey, date);
      for (const game of games) {
        const [existing] = await db
          .select()
          .from(events)
          .where(and(eq(events.provider, "espn"), eq(events.providerId, game.providerId)))
          .limit(1);
        if (!existing) continue; // not one we're tracking (daily-schedule owns creation)

        await db
          .update(events)
          .set({
            status: game.status,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            raw: game.raw,
          })
          .where(eq(events.id, existing.id));

        const wasTerminal = (TERMINAL_STATUSES as readonly string[]).includes(existing.status);
        const isTerminal = (TERMINAL_STATUSES as readonly string[]).includes(game.status);
        if (!wasTerminal && isTerminal) {
          await boss.send("grade-event", { eventId: existing.id });
        }
      }
    } catch (err) {
      log.error({ err, leagueKey }, "live-sync: ESPN fetch failed");
    }
  }
}

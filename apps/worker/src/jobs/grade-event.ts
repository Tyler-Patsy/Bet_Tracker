import { and, eq } from "drizzle-orm";
import { db, events, picks, adminAudit } from "@graded/db";
import { gradePick, type EventStatus } from "@graded/grading";
import type { Logger } from "pino";

// Grades every accepted, still-pending pick linked to one event. Called
// whenever live-sync observes an event transition into final/postponed/
// canceled. One bad pick (e.g. an unmatchable side) never blocks the rest —
// it's logged to admin_audit and left pending for a human to fix, per
// BUILD_SPEC.md §2/§11: never silently grade on partial or bad data.
export async function gradeEvent(eventId: number, log: Logger) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    log.warn({ eventId }, "gradeEvent: event not found");
    return;
  }

  const pending = await db
    .select()
    .from(picks)
    .where(and(eq(picks.eventId, eventId), eq(picks.status, "accepted"), eq(picks.result, "pending")));

  for (const pick of pending) {
    try {
      const result = gradePick({
        sport: pick.sport,
        market: pick.market as "spread" | "moneyline" | "total" | "other",
        side: pick.side,
        line: pick.line == null ? null : Number(pick.line),
        oddsAmerican: pick.oddsAmerican,
        units: Number(pick.units),
        stakeConvention: pick.stakeConvention as "risk" | "to_win",
        mlVariant: pick.mlVariant as "three_way" | "two_way" | "draw_no_bet" | null,
        eventStatus: event.status as EventStatus,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        homeScore: event.homeScore,
        awayScore: event.awayScore,
      });

      const flags = Array.isArray(pick.flags) ? [...(pick.flags as string[])] : [];
      if (result.assumedOdds && !flags.includes("assumed_odds")) flags.push("assumed_odds");

      await db
        .update(picks)
        .set({
          result: result.result,
          profitUnits: result.profitUnits.toFixed(6),
          gradedAt: new Date(),
          flags,
        })
        .where(eq(picks.id, pick.id));
    } catch (err) {
      log.error({ err, pickId: pick.id, eventId }, "failed to grade pick");
      await db.insert(adminAudit).values({
        action: "grade_error",
        entity: "pick",
        entityId: pick.id,
        detail: { eventId, error: (err as Error).message },
      });
    }
  }
}

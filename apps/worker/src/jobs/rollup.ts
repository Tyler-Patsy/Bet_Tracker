import { eq } from "drizzle-orm";
import { db, cappers, picks, rawMessages, capperStats } from "@graded/db";
import { computeStats, type PickForStats, type Window } from "@graded/rollup";
import type { Logger } from "pino";

const WINDOWS: Window[] = ["7d", "30d", "season", "all"];
const MIN_PICKS_FOR_SPORT_BREAKOUT = 5;

async function loadCapperPicks(capperId: number): Promise<PickForStats[]> {
  const rows = await db
    .select({
      sport: picks.sport,
      units: picks.units,
      stakeConvention: picks.stakeConvention,
      oddsAmerican: picks.oddsAmerican,
      result: picks.result,
      status: picks.status,
      postedAt: picks.postedAt,
      flags: picks.flags,
      deletedAt: rawMessages.deletedAt,
    })
    .from(picks)
    .innerJoin(rawMessages, eq(picks.rawMessageId, rawMessages.id))
    .where(eq(picks.capperId, capperId));

  return rows.map((r) => {
    const flags = Array.isArray(r.flags) ? (r.flags as string[]) : [];
    return {
      sport: r.sport,
      units: Number(r.units),
      stakeConvention: r.stakeConvention as PickForStats["stakeConvention"],
      oddsAmerican: r.oddsAmerican,
      result: r.result as PickForStats["result"],
      status: r.status as PickForStats["status"],
      postedAt: r.postedAt,
      flags,
      isDeleted: r.deletedAt !== null || flags.includes("deleted_by_capper"),
    };
  });
}

async function rollupCapper(capperId: number, now: Date): Promise<void> {
  const capperPicks = await loadCapperPicks(capperId);
  const sports = [...new Set(capperPicks.map((p) => p.sport))];

  await db.delete(capperStats).where(eq(capperStats.capperId, capperId));

  const rowsToInsert: (typeof capperStats.$inferInsert)[] = [];

  for (const window of WINDOWS) {
    const allStats = computeStats(capperPicks, window, "all", now);
    rowsToInsert.push({
      capperId,
      window,
      sport: "all",
      wins: allStats.wins,
      losses: allStats.losses,
      pushes: allStats.pushes,
      unitsRisked: allStats.unitsRisked.toFixed(6),
      unitsNet: allStats.unitsNet.toFixed(6),
      roi: allStats.roi === null ? null : allStats.roi.toFixed(6),
      winPct: allStats.winPct === null ? null : allStats.winPct.toFixed(6),
      currentStreak: allStats.currentStreak,
      tail100Pnl: allStats.tail100Pnl.toFixed(6),
      deletedPicks: allStats.deletedPicks,
      gradedPicks: allStats.gradedPicks,
    });

    for (const sport of sports) {
      const sportStats = computeStats(capperPicks, window, sport, now);
      if (sportStats.gradedPicks < MIN_PICKS_FOR_SPORT_BREAKOUT) continue;
      rowsToInsert.push({
        capperId,
        window,
        sport,
        wins: sportStats.wins,
        losses: sportStats.losses,
        pushes: sportStats.pushes,
        unitsRisked: sportStats.unitsRisked.toFixed(6),
        unitsNet: sportStats.unitsNet.toFixed(6),
        roi: sportStats.roi === null ? null : sportStats.roi.toFixed(6),
        winPct: sportStats.winPct === null ? null : sportStats.winPct.toFixed(6),
        currentStreak: sportStats.currentStreak,
        tail100Pnl: sportStats.tail100Pnl.toFixed(6),
        deletedPicks: sportStats.deletedPicks,
        gradedPicks: sportStats.gradedPicks,
      });
    }
  }

  if (rowsToInsert.length > 0) {
    await db.insert(capperStats).values(rowsToInsert);
  }
}

export async function rollupAllCappers(log: Logger): Promise<void> {
  const now = new Date();
  const allCappers = await db.select({ id: cappers.id }).from(cappers);
  for (const c of allCappers) {
    try {
      await rollupCapper(c.id, now);
    } catch (err) {
      log.error({ err, capperId: c.id }, "rollup failed for capper");
    }
  }
  log.info({ count: allCappers.length }, "rollup complete");
}

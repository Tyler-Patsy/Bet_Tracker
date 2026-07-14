import { computePayout, type Outcome, type StakeConvention } from "@graded/grading";
import { seasonWindowFor } from "./season-windows";

export type Window = "7d" | "30d" | "season" | "all";

export interface PickForStats {
  sport: string;
  units: number;
  stakeConvention: StakeConvention;
  oddsAmerican: number | null;
  result: "pending" | "win" | "loss" | "push" | "void";
  status: "pending_review" | "accepted" | "rejected" | "ungradeable";
  postedAt: Date;
  flags: string[];
  isDeleted: boolean;
}

export interface StatsResult {
  wins: number;
  losses: number;
  pushes: number;
  unitsRisked: number;
  unitsNet: number;
  roi: number | null;
  winPct: number | null;
  currentStreak: number; // positive = win streak, negative = loss streak, 0 = none
  tail100Pnl: number;
  deletedPicks: number;
  gradedPicks: number;
}

const TAIL_ASSUMED_ODDS = -110;

function isCounted(p: PickForStats): boolean {
  return (
    p.status === "accepted" &&
    (p.result === "win" || p.result === "loss" || p.result === "push") &&
    !p.flags.includes("posted_after_start") &&
    !p.flags.includes("duplicate")
  );
}

function inWindow(p: PickForStats, window: Window, sport: string, now: Date): boolean {
  if (window === "all") return true;
  if (window === "7d") return now.getTime() - p.postedAt.getTime() <= 7 * 24 * 60 * 60 * 1000;
  if (window === "30d") return now.getTime() - p.postedAt.getTime() <= 30 * 24 * 60 * 60 * 1000;
  const { start, end } = seasonWindowFor(sport, now);
  return p.postedAt >= start && p.postedAt <= end;
}

// Pure aggregation over one capper's picks for one (window, sport) cell of
// capper_stats. Callers pass ALL of a capper's picks (already scoped to the
// right sport, or 'all') and this filters to the window and counted set itself.
export function computeStats(
  allPicks: PickForStats[],
  window: Window,
  sport: string,
  now: Date = new Date()
): StatsResult {
  const inScope = allPicks.filter((p) => inWindow(p, window, sport, now));
  const counted = inScope.filter(isCounted);

  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let unitsRisked = 0;
  let unitsNet = 0;
  let tail100Pnl = 0;

  for (const p of counted) {
    const outcome = p.result as Outcome;
    if (outcome === "win") wins++;
    else if (outcome === "loss") losses++;
    else if (outcome === "push") pushes++;

    const odds = p.oddsAmerican ?? TAIL_ASSUMED_ODDS;
    const payout = computePayout(odds, p.units, p.stakeConvention, outcome);
    unitsRisked += payout.unitsRisked;
    unitsNet += payout.profitUnits;

    const tailPayout = computePayout(odds, 100, "risk", outcome);
    tail100Pnl += tailPayout.profitUnits;
  }

  const roi = unitsRisked > 0 ? unitsNet / unitsRisked : null;
  const winPct = wins + losses > 0 ? wins / (wins + losses) : null;

  // Streak: consecutive W/L from most recent postedAt backward; pushes are
  // transparent (skipped, don't break or extend the streak).
  const streakPicks = counted
    .filter((p) => p.result !== "push")
    .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
  let currentStreak = 0;
  if (streakPicks.length > 0) {
    const first = streakPicks[0].result;
    let count = 0;
    for (const p of streakPicks) {
      if (p.result !== first) break;
      count++;
    }
    currentStreak = first === "win" ? count : -count;
  }

  const deletedPicks = inScope.filter((p) => p.isDeleted).length;
  const gradedPicks = counted.length;

  return {
    wins,
    losses,
    pushes,
    unitsRisked,
    unitsNet,
    roi,
    winPct,
    currentStreak,
    tail100Pnl,
    deletedPicks,
    gradedPicks,
  };
}

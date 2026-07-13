import { computePayout, type Outcome, type StakeConvention } from "./payout";
import { settle, type Market, type MlVariant } from "./settle";

export * from "./payout";
export * from "./settle";

export type EventStatus = "scheduled" | "in_progress" | "final" | "postponed" | "canceled";

export interface GradeInput {
  sport: string;
  market: Market;
  side: string;
  line: number | null;
  oddsAmerican: number | null;
  units: number;
  stakeConvention: StakeConvention;
  mlVariant: MlVariant;
  eventStatus: EventStatus;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface GradeResult {
  result: Extract<Outcome, "win" | "loss" | "push" | "void">;
  profitUnits: number;
  assumedOdds: boolean;
}

// Grades a single pick against its final (or void) event. Pure function —
// no DB, no I/O — so the golden test cases in grade.test.ts fully specify
// its behavior. This module's correctness is the product per BUILD_SPEC.md §12.
export function gradePick(input: GradeInput): GradeResult {
  if (input.eventStatus === "postponed" || input.eventStatus === "canceled") {
    return { result: "void", profitUnits: 0, assumedOdds: false };
  }
  if (input.eventStatus !== "final") {
    throw new Error("Cannot grade a pick whose event is not final");
  }
  if (input.homeScore == null || input.awayScore == null) {
    throw new Error("Final event is missing a score");
  }

  let odds = input.oddsAmerican;
  let assumedOdds = false;
  if (odds == null) {
    if (input.market === "spread" || input.market === "total") {
      odds = -110;
      assumedOdds = true;
    } else {
      throw new Error(`Cannot grade a ${input.market} pick without odds`);
    }
  }

  const outcome = settle({
    market: input.market,
    side: input.side,
    line: input.line,
    mlVariant: input.mlVariant,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    homeScore: input.homeScore,
    awayScore: input.awayScore,
  });

  const { profitUnits } = computePayout(odds, input.units, input.stakeConvention, outcome);
  return { result: outcome, profitUnits, assumedOdds };
}

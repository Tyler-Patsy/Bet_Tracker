export type StakeConvention = "risk" | "to_win";
export type Outcome = "win" | "loss" | "push" | "void";

export interface PayoutResult {
  unitsRisked: number;
  profitUnits: number;
}

export function computePayout(
  odds: number,
  units: number,
  stakeConvention: StakeConvention,
  outcome: Outcome
): PayoutResult {
  let unitsRisked: number;
  let winProfit: number;

  if (stakeConvention === "to_win") {
    unitsRisked = odds > 0 ? (units * 100) / odds : (units * Math.abs(odds)) / 100;
    winProfit = units;
  } else {
    unitsRisked = units;
    winProfit = odds > 0 ? (units * odds) / 100 : (units * 100) / Math.abs(odds);
  }

  switch (outcome) {
    case "win":
      return { unitsRisked, profitUnits: winProfit };
    case "loss":
      return { unitsRisked, profitUnits: -unitsRisked };
    case "push":
    case "void":
      return { unitsRisked, profitUnits: 0 };
  }
}

import { describe, expect, it } from "vitest";
import { computeStats, type PickForStats } from "./compute";

const NOW = new Date("2026-07-13T12:00:00Z");

function pick(overrides: Partial<PickForStats>): PickForStats {
  return {
    sport: "nba",
    units: 1,
    stakeConvention: "risk",
    oddsAmerican: -110,
    result: "win",
    status: "accepted",
    postedAt: NOW,
    flags: [],
    isDeleted: false,
    ...overrides,
  };
}

describe("computeStats", () => {
  it("aggregates wins/losses/pushes and units_net for counted picks", () => {
    const picks = [
      pick({ result: "win" }), // +0.909
      pick({ result: "loss" }), // -1
      pick({ result: "push" }),
    ];
    const stats = computeStats(picks, "all", "nba", NOW);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.pushes).toBe(1);
    expect(stats.gradedPicks).toBe(3);
    expect(stats.unitsNet).toBeCloseTo(0.909 - 1, 3);
    expect(stats.winPct).toBeCloseTo(0.5, 6);
  });

  it("returns null roi/winPct when there are no counted picks", () => {
    const stats = computeStats([], "all", "nba", NOW);
    expect(stats.roi).toBeNull();
    expect(stats.winPct).toBeNull();
    expect(stats.currentStreak).toBe(0);
  });

  it("excludes pending, rejected, and ungradeable picks from the count", () => {
    const picks = [
      pick({ result: "pending", status: "accepted" }),
      pick({ status: "rejected", result: "win" }),
      pick({ status: "ungradeable", result: "pending" }),
      pick({ result: "win" }),
    ];
    const stats = computeStats(picks, "all", "nba", NOW);
    expect(stats.gradedPicks).toBe(1);
  });

  it("excludes posted_after_start and duplicate flagged picks from the record", () => {
    const picks = [
      pick({ result: "win", flags: ["posted_after_start"] }),
      pick({ result: "win", flags: ["duplicate"] }),
      pick({ result: "win", flags: [] }),
    ];
    const stats = computeStats(picks, "all", "nba", NOW);
    expect(stats.gradedPicks).toBe(1);
  });

  it("treats pushes as transparent for streak purposes", () => {
    const picks = [
      pick({ result: "win", postedAt: new Date("2026-07-13T00:00:00Z") }),
      pick({ result: "push", postedAt: new Date("2026-07-12T00:00:00Z") }),
      pick({ result: "win", postedAt: new Date("2026-07-11T00:00:00Z") }),
      pick({ result: "loss", postedAt: new Date("2026-07-10T00:00:00Z") }),
    ];
    const stats = computeStats(picks, "all", "nba", NOW);
    expect(stats.currentStreak).toBe(2); // W, (push skipped), W -> streak of 2 wins
  });

  it("reports a negative number for a loss streak", () => {
    const picks = [
      pick({ result: "loss", postedAt: new Date("2026-07-13T00:00:00Z") }),
      pick({ result: "loss", postedAt: new Date("2026-07-12T00:00:00Z") }),
    ];
    const stats = computeStats(picks, "all", "nba", NOW);
    expect(stats.currentStreak).toBe(-2);
  });

  it("computes tail_100_pnl at flat $100 regardless of the capper's own units/convention", () => {
    const picks = [pick({ result: "win", units: 5, stakeConvention: "to_win", oddsAmerican: 150 })];
    const stats = computeStats(picks, "all", "nba", NOW);
    // Flat $100 risk at +150 win -> +150
    expect(stats.tail100Pnl).toBeCloseTo(150, 6);
  });

  it("counts deleted picks separately from the graded/counted total", () => {
    const picks = [pick({ result: "win", isDeleted: true }), pick({ result: "win", isDeleted: false })];
    const stats = computeStats(picks, "all", "nba", NOW);
    expect(stats.deletedPicks).toBe(1);
    expect(stats.gradedPicks).toBe(2);
  });

  it("filters to the trailing 7d/30d window by postedAt", () => {
    const picks = [
      pick({ result: "win", postedAt: new Date("2026-07-12T00:00:00Z") }), // 1 day ago
      pick({ result: "win", postedAt: new Date("2026-06-01T00:00:00Z") }), // >30 days ago
    ];
    expect(computeStats(picks, "7d", "nba", NOW).gradedPicks).toBe(1);
    expect(computeStats(picks, "30d", "nba", NOW).gradedPicks).toBe(1);
    expect(computeStats(picks, "all", "nba", NOW).gradedPicks).toBe(2);
  });

  it("assumes -110 odds for tail_100_pnl when odds_american is null (assumed_odds picks)", () => {
    const picks = [pick({ result: "win", oddsAmerican: null })];
    const stats = computeStats(picks, "all", "nba", NOW);
    expect(stats.tail100Pnl).toBeCloseTo(100 * (100 / 110), 3);
  });
});

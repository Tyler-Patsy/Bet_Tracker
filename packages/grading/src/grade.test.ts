import { describe, expect, it } from "vitest";
import { gradePick } from "./index";

const nbaGame = {
  sport: "nba",
  homeTeam: "Denver Nuggets",
  awayTeam: "Los Angeles Lakers",
};

describe("golden grading cases (BUILD_SPEC.md §12.3)", () => {
  it("1. -110, 1u risk, win -> +0.909u", () => {
    const r = gradePick({
      ...nbaGame,
      market: "spread",
      side: "Lakers",
      line: -4.5,
      oddsAmerican: -110,
      units: 1,
      stakeConvention: "risk",
      mlVariant: null,
      eventStatus: "final",
      homeScore: 100,
      awayScore: 110, // Lakers (away) win by 10, covers -4.5
    });
    expect(r.result).toBe("win");
    expect(r.profitUnits).toBeCloseTo(0.909, 3);
  });

  it("2. +150, 2u risk, win -> +3.00u", () => {
    const r = gradePick({
      ...nbaGame,
      market: "moneyline",
      side: "Lakers",
      line: null,
      oddsAmerican: 150,
      units: 2,
      stakeConvention: "risk",
      mlVariant: "two_way",
      eventStatus: "final",
      homeScore: 100,
      awayScore: 110,
    });
    expect(r.result).toBe("win");
    expect(r.profitUnits).toBeCloseTo(3.0, 6);
  });

  it("3. -200, 1u, loss -> -1.00u", () => {
    const r = gradePick({
      ...nbaGame,
      market: "moneyline",
      side: "Lakers",
      line: null,
      oddsAmerican: -200,
      units: 1,
      stakeConvention: "risk",
      mlVariant: "two_way",
      eventStatus: "final",
      homeScore: 110,
      awayScore: 100, // Lakers (away) lose
    });
    expect(r.result).toBe("loss");
    expect(r.profitUnits).toBeCloseTo(-1.0, 6);
  });

  it("4. 'to_win' 1u at -110: win -> +1.00u, loss -> -1.10u", () => {
    const win = gradePick({
      ...nbaGame,
      market: "moneyline",
      side: "Lakers",
      line: null,
      oddsAmerican: -110,
      units: 1,
      stakeConvention: "to_win",
      mlVariant: "two_way",
      eventStatus: "final",
      homeScore: 100,
      awayScore: 110,
    });
    expect(win.result).toBe("win");
    expect(win.profitUnits).toBeCloseTo(1.0, 6);

    const loss = gradePick({
      ...nbaGame,
      market: "moneyline",
      side: "Lakers",
      line: null,
      oddsAmerican: -110,
      units: 1,
      stakeConvention: "to_win",
      mlVariant: "two_way",
      eventStatus: "final",
      homeScore: 110,
      awayScore: 100,
    });
    expect(loss.result).toBe("loss");
    expect(loss.profitUnits).toBeCloseTo(-1.1, 6);
  });

  it("5. Spread -3 wins by exactly 3 -> push, 0u", () => {
    const r = gradePick({
      ...nbaGame,
      market: "spread",
      side: "Lakers",
      line: -3,
      oddsAmerican: -110,
      units: 1,
      stakeConvention: "risk",
      mlVariant: null,
      eventStatus: "final",
      homeScore: 100,
      awayScore: 103,
    });
    expect(r.result).toBe("push");
    expect(r.profitUnits).toBe(0);
  });

  it("6. Total 220.5, final 110-110 -> under wins", () => {
    const under = gradePick({
      ...nbaGame,
      market: "total",
      side: "under",
      line: 220.5,
      oddsAmerican: -110,
      units: 1,
      stakeConvention: "risk",
      mlVariant: null,
      eventStatus: "final",
      homeScore: 110,
      awayScore: 110,
    });
    expect(under.result).toBe("win");

    const over = gradePick({
      ...nbaGame,
      market: "total",
      side: "over",
      line: 220.5,
      oddsAmerican: -110,
      units: 1,
      stakeConvention: "risk",
      mlVariant: null,
      eventStatus: "final",
      homeScore: 110,
      awayScore: 110,
    });
    expect(over.result).toBe("loss");
  });

  it("7. Soccer three_way ML, 1-1 draw -> loss", () => {
    const r = gradePick({
      sport: "soccer",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      market: "moneyline",
      side: "Arsenal",
      line: null,
      oddsAmerican: 200,
      units: 1,
      stakeConvention: "risk",
      mlVariant: "three_way",
      eventStatus: "final",
      homeScore: 1,
      awayScore: 1,
    });
    expect(r.result).toBe("loss");
  });

  it("8. DNB, draw -> push", () => {
    const r = gradePick({
      sport: "soccer",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      market: "moneyline",
      side: "Arsenal",
      line: null,
      oddsAmerican: -150,
      units: 1,
      stakeConvention: "risk",
      mlVariant: "draw_no_bet",
      eventStatus: "final",
      homeScore: 1,
      awayScore: 1,
    });
    expect(r.result).toBe("push");
    expect(r.profitUnits).toBe(0);
  });

  it("9. Postponed game -> void, 0u", () => {
    const r = gradePick({
      ...nbaGame,
      market: "spread",
      side: "Lakers",
      line: -4.5,
      oddsAmerican: -110,
      units: 1,
      stakeConvention: "risk",
      mlVariant: null,
      eventStatus: "postponed",
      homeScore: null,
      awayScore: null,
    });
    expect(r.result).toBe("void");
    expect(r.profitUnits).toBe(0);
  });

  it("10. Assumed -110 spread (no odds stated) -> grades normally, flags assumed_odds", () => {
    const r = gradePick({
      ...nbaGame,
      market: "spread",
      side: "Lakers",
      line: -4.5,
      oddsAmerican: null,
      units: 1,
      stakeConvention: "risk",
      mlVariant: null,
      eventStatus: "final",
      homeScore: 100,
      awayScore: 110,
    });
    expect(r.result).toBe("win");
    expect(r.assumedOdds).toBe(true);
    expect(r.profitUnits).toBeCloseTo(0.909, 3);
  });
});

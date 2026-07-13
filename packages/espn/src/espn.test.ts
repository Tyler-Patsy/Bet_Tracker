import { describe, expect, it } from "vitest";
import nbaFixture from "./fixtures/nba-scoreboard.json";
import soccerFixture from "./fixtures/soccer-scoreboard.json";
import { parseScoreboard, formatDateYYYYMMDD, scoreboardUrl } from "./index";

describe("ESPN adapter", () => {
  it("parses a real NBA scoreboard response (recorded fixture)", () => {
    const games = parseScoreboard(nbaFixture, "nba");
    expect(games.length).toBeGreaterThan(0);
    const g = games[0];
    expect(g.sport).toBe("nba");
    expect(g.league).toBe("NBA");
    expect(g.homeTeam).toBeTruthy();
    expect(g.awayTeam).toBeTruthy();
    expect(g.startAt).toBeInstanceOf(Date);
    expect(["scheduled", "in_progress", "final", "postponed", "canceled"]).toContain(g.status);
  });

  it("maps a completed NBA game to status final with numeric scores", () => {
    const games = parseScoreboard(nbaFixture, "nba");
    const finalGame = games.find((g) => g.status === "final");
    expect(finalGame).toBeTruthy();
    expect(typeof finalGame!.homeScore).toBe("number");
    expect(typeof finalGame!.awayScore).toBe("number");
  });

  it("parses a real soccer (EPL) scoreboard response, whose completed status name differs from NBA's", () => {
    const games = parseScoreboard(soccerFixture, "epl");
    expect(games.length).toBeGreaterThan(0);
    const finalGame = games.find((g) => g.status === "final");
    expect(finalGame).toBeTruthy();
    expect(finalGame!.sport).toBe("soccer");
    expect(finalGame!.league).toBe("EPL");
  });

  it("throws instead of silently grading when the events array is missing", () => {
    expect(() => parseScoreboard({}, "nba")).toThrow(/Unexpected ESPN response shape/);
  });

  it("throws when an event is missing competitions", () => {
    expect(() => parseScoreboard({ events: [{ id: "1", date: "2026-01-01T00:00Z" }] }, "nba")).toThrow(
      /missing competitions/
    );
  });

  it("formats dates as YYYYMMDD in UTC", () => {
    expect(formatDateYYYYMMDD(new Date("2026-07-13T00:00:00Z"))).toBe("20260713");
  });

  it("builds the documented scoreboard URL shape per league", () => {
    expect(scoreboardUrl("nfl", new Date("2026-01-01T00:00:00Z"))).toBe(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20260101"
    );
    expect(scoreboardUrl("epl", new Date("2026-01-01T00:00:00Z"))).toBe(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20260101"
    );
  });
});

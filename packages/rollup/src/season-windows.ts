// §13: "'season' = sport-aware (NFL: Sep–Feb, etc.); for the 'all sports'
// season window use calendar YTD." Approximate start/end months per sport;
// tune as real season calendars shift year to year.
interface SeasonSpan {
  startMonth: number; // 1-12
  endMonth: number; // 1-12, may wrap past year-end (e.g. Sep -> Feb)
}

const SEASON_SPANS: Record<string, SeasonSpan> = {
  nfl: { startMonth: 9, endMonth: 2 },
  nba: { startMonth: 10, endMonth: 6 },
  nhl: { startMonth: 10, endMonth: 6 },
  mlb: { startMonth: 4, endMonth: 10 },
  soccer: { startMonth: 8, endMonth: 5 },
};

export function seasonWindowFor(sport: string, now: Date): { start: Date; end: Date } {
  const span = SEASON_SPANS[sport];
  if (!span) {
    // "all sports" (or an unrecognized sport) -> calendar YTD
    return { start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), end: now };
  }

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const wraps = span.endMonth < span.startMonth;

  let seasonStartYear = year;
  if (wraps && month < span.startMonth) {
    // e.g. NFL in Jan/Feb belongs to the season that started the previous September
    seasonStartYear = year - 1;
  }

  const start = new Date(Date.UTC(seasonStartYear, span.startMonth - 1, 1));
  const endYear = wraps ? seasonStartYear + 1 : seasonStartYear;
  const end = new Date(Date.UTC(endYear, span.endMonth, 0)); // last day of endMonth

  return { start, end: end > now ? now : end };
}

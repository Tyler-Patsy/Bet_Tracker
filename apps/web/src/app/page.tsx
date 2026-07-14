import Link from "next/link";
import { db, capperStats, cappers } from "@graded/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { formatDollars, formatPct, formatStreak, formatUnits, unitsColorClass } from "@/lib/format";

export const dynamic = "force-dynamic";

const WINDOWS = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "season", label: "Season" },
  { key: "all", label: "All" },
];

const MIN_GRADED_TO_RANK = 20;

const SORT_COLUMNS = {
  units: capperStats.unitsNet,
  roi: capperStats.roi,
  win_pct: capperStats.winPct,
  streak: capperStats.currentStreak,
  tail: capperStats.tail100Pnl,
} as const;

type SortKey = keyof typeof SORT_COLUMNS;

function buildHref(window: string, sport: string, sort: SortKey, dir: string) {
  return `/?window=${window}&sport=${sport}&sort=${sort}&dir=${dir}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; sport?: string; sort?: string; dir?: string }>;
}) {
  const params = await searchParams;
  const window = WINDOWS.some((w) => w.key === params.window) ? params.window! : "30d";
  const sport = params.sport ?? "all";
  const sort: SortKey = (params.sort as SortKey) in SORT_COLUMNS ? (params.sort as SortKey) : "units";
  const dir = params.dir === "asc" ? "asc" : "desc";

  const sportsRows = await db
    .selectDistinct({ sport: capperStats.sport })
    .from(capperStats)
    .where(sql`${capperStats.sport} != 'all'`);
  const availableSports = ["all", ...sportsRows.map((r) => r.sport).sort()];

  const orderCol = SORT_COLUMNS[sort];
  const rows = await db
    .select({
      capperId: capperStats.capperId,
      slug: cappers.slug,
      displayName: cappers.displayName,
      wins: capperStats.wins,
      losses: capperStats.losses,
      pushes: capperStats.pushes,
      unitsNet: capperStats.unitsNet,
      roi: capperStats.roi,
      winPct: capperStats.winPct,
      currentStreak: capperStats.currentStreak,
      tail100Pnl: capperStats.tail100Pnl,
      deletedPicks: capperStats.deletedPicks,
      gradedPicks: capperStats.gradedPicks,
    })
    .from(capperStats)
    .innerJoin(cappers, eq(capperStats.capperId, cappers.id))
    .where(and(eq(capperStats.window, window), eq(capperStats.sport, sport), eq(cappers.isActive, true)))
    .orderBy(dir === "asc" ? asc(orderCol) : desc(orderCol));

  const ranked = rows.filter((r) => (r.gradedPicks ?? 0) >= MIN_GRADED_TO_RANK);
  const building = rows.filter((r) => (r.gradedPicks ?? 0) < MIN_GRADED_TO_RANK);

  function sortLink(key: SortKey, label: string) {
    const nextDir = sort === key && dir === "desc" ? "asc" : "desc";
    return (
      <Link href={buildHref(window, sport, key, nextDir)} className="hover:text-neutral-100">
        {label}
        {sort === key ? (dir === "desc" ? " ↓" : " ↑") : ""}
      </Link>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Graded</h1>
        <nav className="flex gap-4 text-sm text-neutral-400">
          <Link href="/methodology" className="hover:text-neutral-100">
            Methodology
          </Link>
          <Link href="/submit" className="hover:text-neutral-100">
            Submit a capper
          </Link>
          <Link href="/about" className="hover:text-neutral-100">
            About
          </Link>
        </nav>
      </div>
      <p className="mt-1 text-sm text-neutral-400">
        A public accountability tracker for sports-pick cappers. Every deletion counts.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {WINDOWS.map((w) => (
          <Link
            key={w.key}
            href={buildHref(w.key, sport, sort, dir)}
            className={`rounded px-3 py-1.5 text-sm ${
              window === w.key ? "bg-neutral-100 text-neutral-900" : "bg-neutral-900 text-neutral-300"
            }`}
          >
            {w.label}
          </Link>
        ))}
        <span className="mx-2 text-neutral-700">|</span>
        {availableSports.map((s) => (
          <Link
            key={s}
            href={buildHref(window, s, sort, dir)}
            className={`rounded px-3 py-1.5 text-sm uppercase ${
              sport === s ? "bg-neutral-100 text-neutral-900" : "bg-neutral-900 text-neutral-300"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm [font-variant-numeric:tabular-nums]">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400">
              <th className="py-2 pr-2">Rank</th>
              <th className="pr-2">Capper</th>
              <th className="pr-2">Record</th>
              <th className="pr-2">{sortLink("units", "Units")}</th>
              <th className="pr-2">{sortLink("roi", "ROI")}</th>
              <th className="pr-2">{sortLink("win_pct", "Win%")}</th>
              <th className="pr-2">{sortLink("streak", "Streak")}</th>
              <th className="pr-2">{sortLink("tail", "$100 Tail P&L")}</th>
              <th className="pr-2">⚠ Deleted</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => (
              <tr key={r.capperId} className="border-b border-neutral-900 hover:bg-neutral-900/50">
                <td className="py-2 pr-2 text-neutral-500">{i + 1}</td>
                <td className="pr-2">
                  <Link href={`/capper/${r.slug}`} className="font-medium hover:underline">
                    {r.displayName}
                  </Link>
                  <div className="text-xs text-neutral-500">{r.gradedPicks} graded</div>
                </td>
                <td className="pr-2 text-neutral-400">
                  {r.wins}-{r.losses}-{r.pushes}
                </td>
                <td className={`pr-2 font-medium ${unitsColorClass(r.unitsNet)}`}>
                  {formatUnits(r.unitsNet)}
                </td>
                <td className="pr-2">{formatPct(r.roi)}</td>
                <td className="pr-2">{formatPct(r.winPct)}</td>
                <td className="pr-2">{formatStreak(r.currentStreak)}</td>
                <td className={`pr-2 ${unitsColorClass(r.tail100Pnl)}`}>{formatDollars(r.tail100Pnl)}</td>
                <td className="pr-2 text-neutral-400">{r.deletedPicks ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {building.length > 0 && (
          <>
            <p className="mt-8 text-xs uppercase tracking-wide text-neutral-500">Building sample</p>
            <table className="mt-2 w-full text-left text-sm [font-variant-numeric:tabular-nums] opacity-60">
              <tbody>
                {building.map((r) => (
                  <tr key={r.capperId} className="border-b border-neutral-900">
                    <td className="py-2 pr-2 text-neutral-600">—</td>
                    <td className="pr-2">
                      <Link href={`/capper/${r.slug}`} className="hover:underline">
                        {r.displayName}
                      </Link>
                      <div className="text-xs text-neutral-500">{r.gradedPicks}/{MIN_GRADED_TO_RANK} graded</div>
                    </td>
                    <td className="pr-2 text-neutral-400">
                      {r.wins}-{r.losses}-{r.pushes}
                    </td>
                    <td className={`pr-2 ${unitsColorClass(r.unitsNet)}`}>{formatUnits(r.unitsNet)}</td>
                    <td className="pr-2">{formatPct(r.roi)}</td>
                    <td className="pr-2">{formatPct(r.winPct)}</td>
                    <td className="pr-2">{formatStreak(r.currentStreak)}</td>
                    <td className={`pr-2 ${unitsColorClass(r.tail100Pnl)}`}>{formatDollars(r.tail100Pnl)}</td>
                    <td className="pr-2 text-neutral-400">{r.deletedPicks ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Mobile cards */}
      <div className="mt-6 flex flex-col gap-3 sm:hidden">
        {[...ranked, ...building].map((r, i) => {
          const isRanked = i < ranked.length;
          return (
            <Link
              key={r.capperId}
              href={`/capper/${r.slug}`}
              className={`block rounded border border-neutral-800 bg-neutral-900 p-3 ${!isRanked ? "opacity-60" : ""}`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-medium">
                  {isRanked ? `#${i + 1} ` : ""}
                  {r.displayName}
                </span>
                <span className={`font-medium ${unitsColorClass(r.unitsNet)}`}>{formatUnits(r.unitsNet)}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-neutral-400 [font-variant-numeric:tabular-nums]">
                <span>
                  {r.wins}-{r.losses}-{r.pushes}
                </span>
                <span>ROI {formatPct(r.roi)}</span>
                <span>Win% {formatPct(r.winPct)}</span>
                <span>{formatStreak(r.currentStreak)}</span>
                <span>{isRanked ? `${r.gradedPicks} graded` : `${r.gradedPicks}/${MIN_GRADED_TO_RANK} graded`}</span>
                {(r.deletedPicks ?? 0) > 0 && <span className="text-amber-400">⚠ {r.deletedPicks} deleted</span>}
              </div>
            </Link>
          );
        })}
      </div>

      {rows.length === 0 && (
        <p className="mt-8 text-neutral-500">No graded picks yet for this window/sport.</p>
      )}
    </main>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, cappers, picks, capperStats, rawMessages } from "@graded/db";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { formatPct, formatStreak, formatUnits, unitsColorClass } from "@/lib/format";
import UnitsChart from "@/components/UnitsChart";
import FlagBadges from "@/components/FlagBadges";
import PendingPicks from "@/components/PendingPicks";

export const dynamic = "force-dynamic";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [capper] = await db.select().from(cappers).where(eq(cappers.slug, slug)).limit(1);
  if (!capper) return {};

  const [stats] = await db
    .select()
    .from(capperStats)
    .where(and(eq(capperStats.capperId, capper.id), eq(capperStats.window, "30d"), eq(capperStats.sport, "all")))
    .limit(1);

  const unitsText = stats ? `${Number(stats.unitsNet) >= 0 ? "+" : ""}${Number(stats.unitsNet).toFixed(2)}` : "0.00";
  return {
    title: `${capper.displayName} Verified Pick Record — ${unitsText} units last 30 days`,
    description: `Publicly tracked, deletion-proof pick record for ${capper.displayName}.`,
  };
}

export default async function CapperProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [capper] = await db.select().from(cappers).where(eq(cappers.slug, slug)).limit(1);
  if (!capper) notFound();

  const [stats30d] = await db
    .select()
    .from(capperStats)
    .where(and(eq(capperStats.capperId, capper.id), eq(capperStats.window, "30d"), eq(capperStats.sport, "all")))
    .limit(1);

  const acceptedPicks = await db
    .select()
    .from(picks)
    .where(and(eq(picks.capperId, capper.id), eq(picks.status, "accepted")))
    .orderBy(desc(picks.postedAt));

  const graded = acceptedPicks.filter((p) => p.result !== "pending");
  const pending = acceptedPicks.filter((p) => p.result === "pending");

  const since = new Date(Date.now() - NINETY_DAYS_MS);
  const chartPoints = graded
    .filter((p) => p.gradedAt && new Date(p.gradedAt) >= since)
    .sort((a, b) => new Date(a.gradedAt!).getTime() - new Date(b.gradedAt!).getTime())
    .reduce<{ date: Date; cumulative: number }[]>((acc, p) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
      acc.push({ date: new Date(p.gradedAt!), cumulative: prev + Number(p.profitUnits ?? 0) });
      return acc;
    }, []);

  const rawMessageIds = [...new Set(acceptedPicks.map((p) => p.rawMessageId))];
  const deletionLog =
    rawMessageIds.length > 0
      ? await db
          .select()
          .from(rawMessages)
          .where(and(inArray(rawMessages.id, rawMessageIds), isNotNull(rawMessages.deletedAt)))
          .orderBy(asc(rawMessages.deletedAt))
      : [];

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <a href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Graded
      </a>
      <h1 className="mt-2 text-2xl font-semibold">{capper.displayName}</h1>
      {capper.bio && <p className="mt-1 text-sm text-neutral-400">{capper.bio}</p>}

      {stats30d && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded border border-neutral-800 bg-neutral-900 p-3">
            <div className="text-xs text-neutral-500">Record (30d)</div>
            <div className="mt-1 [font-variant-numeric:tabular-nums]">
              {stats30d.wins}-{stats30d.losses}-{stats30d.pushes}
            </div>
          </div>
          <div className="rounded border border-neutral-800 bg-neutral-900 p-3">
            <div className="text-xs text-neutral-500">Units (30d)</div>
            <div className={`mt-1 font-medium [font-variant-numeric:tabular-nums] ${unitsColorClass(stats30d.unitsNet)}`}>
              {formatUnits(stats30d.unitsNet)}
            </div>
          </div>
          <div className="rounded border border-neutral-800 bg-neutral-900 p-3">
            <div className="text-xs text-neutral-500">Win% (30d)</div>
            <div className="mt-1 [font-variant-numeric:tabular-nums]">{formatPct(stats30d.winPct)}</div>
          </div>
          <div className="rounded border border-neutral-800 bg-neutral-900 p-3">
            <div className="text-xs text-neutral-500">Streak</div>
            <div className="mt-1 [font-variant-numeric:tabular-nums]">{formatStreak(stats30d.currentStreak)}</div>
          </div>
        </div>
      )}
      {!stats30d && (
        <p className="mt-4 text-sm text-neutral-500">Building sample — not enough graded picks yet.</p>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Cumulative units (last 90 days)</h2>
        <div className="mt-3 rounded border border-neutral-800 bg-neutral-900 p-3">
          <UnitsChart points={chartPoints} />
        </div>
      </section>

      <PendingPicks
        picks={pending.map((p) => ({
          id: p.id,
          postedAt: p.postedAt,
          eventDesc: p.eventDesc,
          market: p.market,
          side: p.side,
          line: p.line,
          oddsAmerican: p.oddsAmerican,
          units: p.units,
          flags: Array.isArray(p.flags) ? (p.flags as string[]) : [],
        }))}
      />

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Pick history</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm [font-variant-numeric:tabular-nums]">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="py-2 pr-2">Date</th>
                <th className="pr-2">Event</th>
                <th className="pr-2">Pick</th>
                <th className="pr-2">Units</th>
                <th className="pr-2">Result</th>
                <th className="pr-2">Profit</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {graded.map((p) => {
                const flags = Array.isArray(p.flags) ? (p.flags as string[]) : [];
                return (
                  <tr key={p.id} className="border-b border-neutral-900">
                    <td className="py-2 pr-2 text-neutral-400">
                      {new Date(p.postedAt).toLocaleDateString()}
                    </td>
                    <td className="pr-2">{p.eventDesc}</td>
                    <td className="pr-2">
                      {p.side}
                      {p.line ? ` ${p.line}` : ""}
                      {p.oddsAmerican ? ` (${p.oddsAmerican > 0 ? "+" : ""}${p.oddsAmerican})` : ""}
                    </td>
                    <td className="pr-2">{p.units}</td>
                    <td className="pr-2 text-neutral-400">{p.result}</td>
                    <td className={`pr-2 font-medium ${unitsColorClass(p.profitUnits)}`}>
                      {p.profitUnits === null ? "—" : formatUnits(p.profitUnits)}
                    </td>
                    <td>
                      <FlagBadges flags={flags} />
                    </td>
                  </tr>
                );
              })}
              {graded.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-neutral-500">
                    No graded picks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {deletionLog.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-amber-400">Deletion log</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Messages this capper deleted after posting — the record stays.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {deletionLog.map((m) => (
              <div key={m.id} className="rounded border border-amber-900/50 bg-amber-950/20 p-3 text-sm">
                <div className="text-neutral-400">
                  Posted {new Date(m.postedAt).toLocaleString()} · deleted{" "}
                  {m.deletedAt ? new Date(m.deletedAt).toLocaleString() : ""}
                </div>
                <div className="mt-1 whitespace-pre-wrap">{m.text}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

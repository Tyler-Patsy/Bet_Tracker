import Link from "next/link";
import { db, capperStats, cappers } from "@graded/db";
import { and, desc, eq } from "drizzle-orm";
import { formatUnits, unitsColorClass } from "@/lib/format";
import { gradeFor, MIN_GRADED_TO_RANK } from "@/lib/grade";
import GradeBadge from "@/components/GradeBadge";

export const dynamic = "force-dynamic";

export default async function Home() {
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
      gradedPicks: capperStats.gradedPicks,
      deletedPicks: capperStats.deletedPicks,
    })
    .from(capperStats)
    .innerJoin(cappers, eq(capperStats.capperId, cappers.id))
    .where(
      and(eq(capperStats.window, "30d"), eq(capperStats.sport, "all"), eq(cappers.isActive, true))
    )
    .orderBy(desc(capperStats.unitsNet))
    .limit(5);

  const ranked = rows.filter((r) => (r.gradedPicks ?? 0) >= MIN_GRADED_TO_RANK);

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              The public record for sports picks
            </p>
            <h1 className="font-display mt-4 text-5xl font-bold uppercase leading-[0.95] tracking-tight text-neutral-100 sm:text-7xl">
              Every pick tracked.
              <br />
              Every{" "}
              <span className="text-amber-400 line-through decoration-2">deletion</span>{" "}
              counted.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-neutral-400">
              Cappers grade their own records. We don&apos;t think that&apos;s a record.
              Graded captures picks the moment they&apos;re posted, grades them against
              final scores, and keeps them on the board forever — deleted or not.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/leaderboard"
                className="rounded-sm bg-neutral-100 px-5 py-2.5 text-sm font-medium text-neutral-900 hover:bg-white"
              >
                View the leaderboard
              </Link>
              <Link
                href="/methodology"
                className="rounded-sm border border-neutral-700 px-5 py-2.5 text-sm text-neutral-200 hover:border-neutral-500"
              >
                How grading works
              </Link>
            </div>
          </div>

          {/* Sample record card — static illustration of the product */}
          <div className="relative rounded-sm border border-neutral-800 bg-neutral-900 p-5">
            <span className="absolute right-3 top-3 rounded-sm border border-neutral-700 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-neutral-500">
              Sample
            </span>
            <div className="flex items-center gap-3">
              <GradeBadge grade="B" size="lg" />
              <div>
                <div className="font-medium text-neutral-100">@capper</div>
                <div className="text-xs text-neutral-500 [font-variant-numeric:tabular-nums]">
                  41-38-2 · 81 graded · last 30d
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-display text-2xl font-bold text-green-400 [font-variant-numeric:tabular-nums]">
                  +7.40u
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col text-sm [font-variant-numeric:tabular-nums]">
              <div className="flex items-baseline justify-between border-t border-neutral-800 py-2.5">
                <span className="text-neutral-300">Chiefs -3.5 (-110) · 1u</span>
                <span className="font-medium text-green-400">W +0.91u</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-neutral-800 py-2.5">
                <span className="text-neutral-300">Lakers ML (+150) · 1u</span>
                <span className="font-medium text-red-400">L −1.00u</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-neutral-800 py-2.5">
                <span className="text-amber-400/90 line-through">Under 8.5 (-105) · 2u</span>
                <span className="font-medium text-red-400">L −2.00u</span>
              </div>
              <div className="border-t border-neutral-800 pt-2.5 text-xs text-amber-400">
                ⚠ Deleted after loss — still counted.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-neutral-800">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-neutral-100">
            How it works
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            <div>
              <div className="font-display text-4xl font-semibold text-neutral-600">01</div>
              <h3 className="mt-2 font-medium text-neutral-100">Captured as posted</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                The exact text and timestamp are archived the moment a pick goes up —
                and checked against the game&apos;s actual start time. Posted after
                kickoff? Flagged, excluded.
              </p>
            </div>
            <div>
              <div className="font-display text-4xl font-semibold text-neutral-600">02</div>
              <h3 className="mt-2 font-medium text-neutral-100">Graded by the final score</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                Win, loss, or push against real results — at the odds the capper
                actually posted, never a number we picked for them.
              </p>
            </div>
            <div>
              <div className="font-display text-4xl font-semibold text-neutral-600">03</div>
              <h3 className="mt-2 font-medium text-neutral-100">
                <span className="text-amber-400 line-through">Deleted?</span> Still counted.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                Deleting the post doesn&apos;t delete the pick. It stays on the record,
                marked — and every profile shows a running deletion count.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard preview */}
      <section className="border-t border-neutral-800">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-neutral-100">
              The board
            </h2>
            <Link href="/leaderboard" className="text-sm text-neutral-400 hover:text-neutral-100">
              Full leaderboard →
            </Link>
          </div>

          {ranked.length > 0 ? (
            <div className="mt-6 flex flex-col [font-variant-numeric:tabular-nums]">
              {ranked.map((r, i) => (
                <Link
                  key={r.capperId}
                  href={`/capper/${r.slug}`}
                  className="flex items-center gap-4 border-t border-neutral-800 py-3 last:border-b hover:bg-neutral-900/50"
                >
                  <span className="w-6 text-sm text-neutral-500">{i + 1}</span>
                  <GradeBadge grade={gradeFor(r.roi, r.gradedPicks)} />
                  <span className="font-medium text-neutral-100">{r.displayName}</span>
                  <span className="hidden text-sm text-neutral-500 sm:inline">
                    {r.wins}-{r.losses}-{r.pushes}
                  </span>
                  {(r.deletedPicks ?? 0) > 0 && (
                    <span className="text-xs text-amber-400">⚠ {r.deletedPicks}</span>
                  )}
                  <span className={`ml-auto font-medium ${unitsColorClass(r.unitsNet)}`}>
                    {formatUnits(r.unitsNet)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-sm border border-neutral-800 p-8">
              <p className="font-display text-2xl font-semibold uppercase text-neutral-300">
                Records are building.
              </p>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-neutral-400">
                Cappers appear on the board after {MIN_GRADED_TO_RANK} graded picks. No
                shortcuts and no seed data — every number here is computed from archived,
                timestamped posts, so the board fills in as records are earned.
              </p>
              <Link
                href="/submit"
                className="mt-4 inline-block text-sm text-neutral-200 underline underline-offset-4 hover:text-white"
              >
                Suggest a capper to track →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Why trust it */}
      <section className="border-t border-neutral-800">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-neutral-100">
            Why the numbers hold up
          </h2>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            <div className="border-l-2 border-neutral-800 pl-4">
              <h3 className="text-sm font-medium text-neutral-100">Timestamps don&apos;t negotiate</h3>
              <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                Every pick is checked against the game&apos;s scheduled start. The
                after-the-fact &quot;called it&quot; post is the oldest trick in the book —
                it doesn&apos;t work here.
              </p>
            </div>
            <div className="border-l-2 border-neutral-800 pl-4">
              <h3 className="text-sm font-medium text-neutral-100">Originals only</h3>
              <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                Edited a pick mid-game? We grade the original text, flag the edit, and
                show both. The archive never changes.
              </p>
            </div>
            <div className="border-l-2 border-neutral-800 pl-4">
              <h3 className="text-sm font-medium text-neutral-100">Posted odds, not house odds</h3>
              <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                Grading uses whatever number the capper wrote. When odds are missing on a
                spread or total we assume the standard −110 — and say so on the pick.
              </p>
            </div>
            <div className="border-l-2 border-neutral-800 pl-4">
              <h3 className="text-sm font-medium text-neutral-100">Reproducible by anyone</h3>
              <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                Every stat traces to an archived public post. The full rulebook is public
                — <Link href="/methodology" className="underline underline-offset-4 hover:text-neutral-100">read the methodology</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="border-t border-neutral-800">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-sm border border-neutral-800 bg-neutral-900 p-8">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-neutral-100">
                Following someone we should be tracking?
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                Free picks, public account, any sport. We&apos;ll put their record on the board.
              </p>
            </div>
            <Link
              href="/submit"
              className="rounded-sm bg-neutral-100 px-5 py-2.5 text-sm font-medium text-neutral-900 hover:bg-white"
            >
              Submit a capper
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

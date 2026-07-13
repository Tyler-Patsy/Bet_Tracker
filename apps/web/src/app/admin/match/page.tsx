import { db, picks, events, cappers } from "@graded/db";
import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import { linkPickToEvent } from "./actions";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function MatchPage() {
  const unmatched = await db
    .select({
      id: picks.id,
      sport: picks.sport,
      eventDesc: picks.eventDesc,
      side: picks.side,
      market: picks.market,
      postedAt: picks.postedAt,
      capperName: cappers.displayName,
    })
    .from(picks)
    .innerJoin(cappers, eq(picks.capperId, cappers.id))
    .where(and(eq(picks.status, "accepted"), isNull(picks.eventId)))
    .orderBy(asc(picks.postedAt));

  const candidatesByPick = await Promise.all(
    unmatched.map((p) =>
      db
        .select()
        .from(events)
        .where(
          and(
            eq(events.sport, p.sport),
            gte(events.startAt, new Date(new Date(p.postedAt).getTime() - DAY_MS)),
            lte(events.startAt, new Date(new Date(p.postedAt).getTime() + 2 * DAY_MS))
          )
        )
        .orderBy(asc(events.startAt))
    )
  );

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <a href="/admin" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Admin
      </a>
      <h1 className="mt-2 text-xl font-semibold">Match picks to events</h1>
      <p className="mt-1 max-w-lg text-sm text-neutral-400">
        Accepted picks need a linked event before they can auto-grade. Event matching is
        manual for now — automatic fuzzy matching lands in Milestone 3.
      </p>

      <div className="mt-6 flex max-w-2xl flex-col gap-4">
        {unmatched.map((p, i) => {
          const candidates = candidatesByPick[i];
          return (
            <form
              key={p.id}
              action={linkPickToEvent}
              className="rounded border border-neutral-800 bg-neutral-900 p-4"
            >
              <input type="hidden" name="pick_id" value={p.id} />
              <div className="text-sm">
                <span className="text-neutral-400">{p.capperName}</span> · {p.eventDesc} ·{" "}
                {p.market} {p.side}
              </div>
              <div className="mt-2 flex gap-2">
                <select
                  name="event_id"
                  required
                  className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm"
                >
                  <option value="">
                    {candidates.length === 0 ? "No candidate events found" : "Select event…"}
                  </option>
                  {candidates.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.awayTeam} @ {ev.homeTeam} — {new Date(ev.startAt).toLocaleString()}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={candidates.length === 0}
                  className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-40"
                >
                  Link
                </button>
              </div>
            </form>
          );
        })}
        {unmatched.length === 0 && (
          <p className="text-neutral-500">Every accepted pick is already linked to an event.</p>
        )}
      </div>
    </main>
  );
}

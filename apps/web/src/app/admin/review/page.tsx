import { db, rawMessages, sources, cappers, picks, events } from "@graded/db";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { createPickFromRawMessage, markNoPicks, decidePick } from "./actions";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function ReviewPage() {
  const pendingReview = await db
    .select({
      id: picks.id,
      sport: picks.sport,
      league: picks.league,
      eventDesc: picks.eventDesc,
      market: picks.market,
      side: picks.side,
      line: picks.line,
      oddsAmerican: picks.oddsAmerican,
      units: picks.units,
      stakeConvention: picks.stakeConvention,
      mlVariant: picks.mlVariant,
      eventId: picks.eventId,
      confidence: picks.confidence,
      flags: picks.flags,
      parserQuote: picks.parserQuote,
      postedAt: picks.postedAt,
      capperName: cappers.displayName,
      rawText: rawMessages.text,
      rawMedia: rawMessages.media,
    })
    .from(picks)
    .innerJoin(cappers, eq(picks.capperId, cappers.id))
    .innerJoin(rawMessages, eq(picks.rawMessageId, rawMessages.id))
    .where(eq(picks.status, "pending_review"))
    .orderBy(asc(picks.postedAt));

  const candidatesByPick = await Promise.all(
    pendingReview.map((p) =>
      p.eventId
        ? Promise.resolve([])
        : db
            .select()
            .from(events)
            .where(
              and(
                eq(events.sport, p.sport),
                gte(events.startAt, new Date(new Date(p.postedAt).getTime() - DAY_MS)),
                lte(events.startAt, new Date(new Date(p.postedAt).getTime() + DAY_MS))
              )
            )
            .orderBy(asc(events.startAt))
    )
  );

  const needsAttention = await db
    .select({
      id: rawMessages.id,
      text: rawMessages.text,
      media: rawMessages.media,
      postedAt: rawMessages.postedAt,
      parseStatus: rawMessages.parseStatus,
      capperName: cappers.displayName,
    })
    .from(rawMessages)
    .innerJoin(sources, eq(rawMessages.sourceId, sources.id))
    .innerJoin(cappers, eq(sources.capperId, cappers.id))
    .where(inArray(rawMessages.parseStatus, ["pending", "error"]))
    .orderBy(asc(rawMessages.postedAt));

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <a href="/admin" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Admin
      </a>
      <h1 className="mt-2 text-xl font-semibold">Review queue</h1>
      <p className="mt-1 text-sm text-neutral-400">{pendingReview.length} pending review</p>

      <div className="mt-6 flex max-w-3xl flex-col gap-6">
        {pendingReview.map((p, i) => {
          const candidates = candidatesByPick[i];
          const flags = Array.isArray(p.flags) ? (p.flags as string[]) : [];
          return (
            <div key={p.id} className="rounded border border-neutral-800 bg-neutral-900 p-4">
              <div className="text-xs text-neutral-500">
                {p.capperName} · {new Date(p.postedAt).toLocaleString()} · confidence{" "}
                {p.confidence ? Number(p.confidence).toFixed(2) : "—"}
              </div>
              <div className="mt-2 whitespace-pre-wrap rounded bg-neutral-950 p-3 text-sm">
                {p.rawText}
              </div>
              {p.parserQuote && (
                <div className="mt-1 text-xs text-neutral-500">
                  parsed from: <span className="italic">&quot;{p.parserQuote}&quot;</span>
                </div>
              )}
              {flags.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {flags.map((f) => (
                    <span key={f} className="rounded bg-amber-900/50 px-2 py-0.5 text-xs text-amber-300">
                      {f}
                    </span>
                  ))}
                </div>
              )}
              {Array.isArray(p.rawMedia) && p.rawMedia.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(p.rawMedia as Array<Record<string, unknown>>).map((m, mi) =>
                    m.type === "photo" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={mi}
                        src={String(m.dataUrl)}
                        alt="screenshot"
                        className="h-24 rounded border border-neutral-800"
                      />
                    ) : null
                  )}
                </div>
              )}

              <form action={decidePick} className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <input type="hidden" name="pick_id" value={p.id} />
                <select
                  name="sport"
                  defaultValue={p.sport}
                  required
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                >
                  <option value="nfl">NFL</option>
                  <option value="nba">NBA</option>
                  <option value="mlb">MLB</option>
                  <option value="nhl">NHL</option>
                  <option value="soccer">Soccer</option>
                  <option value="other">Other</option>
                </select>
                <input
                  name="league"
                  defaultValue={p.league ?? ""}
                  placeholder="League"
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                />
                <input
                  name="event_desc"
                  defaultValue={p.eventDesc}
                  required
                  className="col-span-2 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                />
                {p.eventId ? (
                  <input type="hidden" name="event_id" value={p.eventId} />
                ) : (
                  <select
                    name="event_id"
                    required
                    className="col-span-2 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
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
                )}
                <select
                  name="market"
                  defaultValue={p.market}
                  required
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                >
                  <option value="spread">Spread</option>
                  <option value="moneyline">Moneyline</option>
                  <option value="total">Total</option>
                  <option value="other">Other</option>
                </select>
                <input
                  name="side"
                  defaultValue={p.side}
                  required
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                />
                <input
                  name="line"
                  defaultValue={p.line ?? ""}
                  placeholder="Line"
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                />
                <input
                  name="odds_american"
                  defaultValue={p.oddsAmerican ?? ""}
                  placeholder="Odds"
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                />
                <input
                  name="units"
                  defaultValue={p.units}
                  placeholder="Units"
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                />
                <select
                  name="stake_convention"
                  defaultValue={p.stakeConvention}
                  className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                >
                  <option value="risk">Risk</option>
                  <option value="to_win">To win</option>
                </select>
                <input
                  name="ml_variant"
                  defaultValue={p.mlVariant ?? ""}
                  placeholder="ML variant"
                  className="col-span-2 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                />

                <div className="col-span-2 mt-2 flex gap-2">
                  <button
                    type="submit"
                    name="intent"
                    value="accept"
                    className="rounded bg-green-600 px-3 py-1.5 font-medium text-white"
                  >
                    Accept
                  </button>
                  <button
                    type="submit"
                    name="intent"
                    value="reject"
                    className="rounded bg-red-900 px-3 py-1.5 font-medium text-red-100"
                  >
                    Reject
                  </button>
                  <button
                    type="submit"
                    name="intent"
                    value="ungradeable"
                    className="rounded bg-neutral-700 px-3 py-1.5 font-medium text-neutral-100"
                  >
                    Mark ungradeable
                  </button>
                </div>
              </form>
            </div>
          );
        })}
        {pendingReview.length === 0 && <p className="text-neutral-500">Nothing to review.</p>}
      </div>

      {needsAttention.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">Needs attention</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Not yet parsed, or the parser errored — enter the pick by hand.
          </p>
          <div className="mt-4 flex max-w-3xl flex-col gap-6">
            {needsAttention.map((r) => (
              <div key={r.id} className="rounded border border-neutral-800 bg-neutral-900 p-4">
                <div className="text-xs text-neutral-500">
                  {r.capperName} · {new Date(r.postedAt).toLocaleString()} ·{" "}
                  <span className="text-amber-400">{r.parseStatus}</span>
                </div>
                <div className="mt-2 whitespace-pre-wrap rounded bg-neutral-950 p-3 text-sm">
                  {r.text}
                </div>

                <form
                  action={createPickFromRawMessage}
                  className="mt-4 grid grid-cols-2 gap-2 text-sm"
                >
                  <input type="hidden" name="raw_message_id" value={r.id} />
                  <select
                    name="sport"
                    required
                    className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                  >
                    <option value="nfl">NFL</option>
                    <option value="nba">NBA</option>
                    <option value="mlb">MLB</option>
                    <option value="nhl">NHL</option>
                    <option value="soccer">Soccer</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    name="league"
                    placeholder="League (optional)"
                    className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                  />
                  <input
                    name="event_desc"
                    placeholder="Event (e.g. Lakers @ Nuggets 7/13)"
                    required
                    className="col-span-2 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                  />
                  <select
                    name="market"
                    required
                    className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                  >
                    <option value="spread">Spread</option>
                    <option value="moneyline">Moneyline</option>
                    <option value="total">Total</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    name="side"
                    placeholder="Side (team, or over/under)"
                    required
                    className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                  />
                  <input
                    name="line"
                    placeholder="Line (e.g. -4.5)"
                    className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                  />
                  <input
                    name="odds_american"
                    placeholder="Odds (e.g. -110)"
                    className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                  />
                  <input
                    name="units"
                    defaultValue="1"
                    placeholder="Units"
                    className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                  />
                  <select
                    name="stake_convention"
                    className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                  >
                    <option value="risk">Risk</option>
                    <option value="to_win">To win</option>
                  </select>
                  <input
                    name="ml_variant"
                    placeholder="ML variant (soccer only, optional)"
                    className="col-span-2 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5"
                  />

                  <div className="col-span-2 mt-2 flex gap-2">
                    <button
                      type="submit"
                      name="intent"
                      value="accept"
                      className="rounded bg-green-600 px-3 py-1.5 font-medium text-white"
                    >
                      Accept
                    </button>
                    <button
                      type="submit"
                      name="intent"
                      value="ungradeable"
                      className="rounded bg-neutral-700 px-3 py-1.5 font-medium text-neutral-100"
                    >
                      Mark ungradeable
                    </button>
                  </div>
                </form>

                <form action={markNoPicks.bind(null, r.id)} className="mt-2">
                  <button
                    type="submit"
                    className="text-xs text-neutral-500 underline hover:text-neutral-300"
                  >
                    No pick in this message
                  </button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

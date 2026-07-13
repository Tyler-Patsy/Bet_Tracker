import { db, rawMessages, sources, cappers } from "@graded/db";
import { asc, eq } from "drizzle-orm";
import { createPickFromRawMessage, markNoPicks } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const rows = await db
    .select({
      id: rawMessages.id,
      text: rawMessages.text,
      media: rawMessages.media,
      postedAt: rawMessages.postedAt,
      capperName: cappers.displayName,
    })
    .from(rawMessages)
    .innerJoin(sources, eq(rawMessages.sourceId, sources.id))
    .innerJoin(cappers, eq(sources.capperId, cappers.id))
    .where(eq(rawMessages.parseStatus, "pending"))
    .orderBy(asc(rawMessages.postedAt));

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <a href="/admin" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Admin
      </a>
      <h1 className="mt-2 text-xl font-semibold">Review queue</h1>
      <p className="mt-1 text-sm text-neutral-400">{rows.length} pending</p>

      <div className="mt-6 flex max-w-3xl flex-col gap-6">
        {rows.map((r) => (
          <div key={r.id} className="rounded border border-neutral-800 bg-neutral-900 p-4">
            <div className="text-xs text-neutral-500">
              {r.capperName} · {new Date(r.postedAt).toLocaleString()}
            </div>
            <div className="mt-2 whitespace-pre-wrap rounded bg-neutral-950 p-3 text-sm">
              {r.text}
            </div>
            {Array.isArray(r.media) && r.media.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(r.media as Array<Record<string, unknown>>).map((m, i) =>
                  m.type === "photo" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={String(m.dataUrl)}
                      alt="screenshot"
                      className="h-24 rounded border border-neutral-800"
                    />
                  ) : m.type === "tweet_url" ? (
                    <a
                      key={i}
                      href={String(m.url)}
                      className="text-xs text-neutral-400 underline"
                    >
                      {String(m.url)}
                    </a>
                  ) : null
                )}
              </div>
            )}

            <form action={createPickFromRawMessage} className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <input type="hidden" name="raw_message_id" value={r.id} />
              <select name="sport" required className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5">
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
              <select name="market" required className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5">
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
              <button type="submit" className="text-xs text-neutral-500 underline hover:text-neutral-300">
                No pick in this message
              </button>
            </form>
          </div>
        ))}
        {rows.length === 0 && <p className="text-neutral-500">Nothing to review.</p>}
      </div>
    </main>
  );
}

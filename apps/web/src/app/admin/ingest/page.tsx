import { db, cappers } from "@graded/db";
import { createManualIngest } from "./actions";

export const dynamic = "force-dynamic";

export default async function IngestPage() {
  const allCappers = await db
    .select({ id: cappers.id, displayName: cappers.displayName })
    .from(cappers)
    .orderBy(cappers.displayName);

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <a href="/admin" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Admin
      </a>
      <h1 className="mt-2 text-xl font-semibold">Manual ingest (X/Twitter paste)</h1>
      <p className="mt-1 max-w-lg text-sm text-neutral-400">
        Paste a pick you read anywhere (X, Instagram, Reddit, a screenshot). Posted-at is the
        post&apos;s own timestamp, not now — this is what integrity checks grade against.
      </p>

      <form
        action={createManualIngest}
        encType="multipart/form-data"
        className="mt-6 grid max-w-lg gap-3"
      >
        <select
          name="capper_id"
          required
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        >
          <option value="">Select capper…</option>
          {allCappers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
        <label className="text-xs text-neutral-400">
          Posted at (tweet timestamp)
          <input
            type="datetime-local"
            name="posted_at"
            required
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
        </label>
        <input
          name="tweet_url"
          placeholder="Tweet URL (for receipts)"
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <textarea
          name="pick_text"
          placeholder="Pick text, exactly as posted (optional if you attach a screenshot below)"
          rows={4}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <label className="text-xs text-neutral-400">
          Screenshot — bet slip, Instagram post, anything image-based (required if no text above)
          <input
            type="file"
            name="screenshot"
            accept="image/*"
            className="mt-1 w-full text-sm text-neutral-400"
          />
        </label>
        <button
          type="submit"
          className="w-fit rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900"
        >
          Submit for review
        </button>
      </form>
    </main>
  );
}

import { db, submissions } from "@graded/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const rows = await db.select().from(submissions).orderBy(desc(submissions.createdAt));

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <a href="/admin" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Admin
      </a>
      <h1 className="mt-2 text-xl font-semibold">Capper submissions</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Suggestions from the public /submit form. Add ones worth tracking via Cappers + Sources.
      </p>

      <div className="mt-6 flex max-w-2xl flex-col gap-3">
        {rows.map((s) => (
          <div key={s.id} className="rounded border border-neutral-800 bg-neutral-900 p-3 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-neutral-500">
                {new Date(s.createdAt).toLocaleString()}
              </span>
            </div>
            {s.link && (
              <a href={s.link} className="mt-1 block break-all text-xs text-neutral-400 underline">
                {s.link}
              </a>
            )}
            {s.why && <p className="mt-1 text-neutral-300">{s.why}</p>}
          </div>
        ))}
        {rows.length === 0 && <p className="text-neutral-500">No submissions yet.</p>}
      </div>
    </main>
  );
}

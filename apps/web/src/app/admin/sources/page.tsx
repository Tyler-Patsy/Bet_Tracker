import { db, sources, cappers } from "@graded/db";
import { desc, eq } from "drizzle-orm";
import { createSource, toggleSourceActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const rows = await db
    .select({
      id: sources.id,
      kind: sources.kind,
      handle: sources.handle,
      isActive: sources.isActive,
      capperName: cappers.displayName,
    })
    .from(sources)
    .innerJoin(cappers, eq(sources.capperId, cappers.id))
    .orderBy(desc(sources.id));

  const allCappers = await db
    .select({ id: cappers.id, displayName: cappers.displayName })
    .from(cappers)
    .orderBy(cappers.displayName);

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <a href="/admin" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Admin
      </a>
      <h1 className="mt-2 text-xl font-semibold">Sources</h1>

      <form action={createSource} className="mt-6 grid max-w-lg gap-3">
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
        <select
          name="kind"
          required
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        >
          <option value="telegram">Telegram</option>
          <option value="reddit">Reddit</option>
          <option value="x_manual">X (manual paste)</option>
        </select>
        <input
          name="handle"
          placeholder="@channel, u/username, or @xhandle"
          required
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          className="w-fit rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900"
        >
          Add source
        </button>
      </form>

      <table className="mt-8 w-full max-w-3xl text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-neutral-400">
            <th className="py-2">Capper</th>
            <th>Kind</th>
            <th>Handle</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b border-neutral-900">
              <td className="py-2">{s.capperName}</td>
              <td className="text-neutral-400">{s.kind}</td>
              <td className="text-neutral-400">{s.handle}</td>
              <td>
                <form action={toggleSourceActive.bind(null, s.id, !s.isActive)}>
                  <button
                    type="submit"
                    className={s.isActive ? "text-green-400" : "text-neutral-500"}
                  >
                    {s.isActive ? "active" : "inactive"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-neutral-500">
                No sources yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

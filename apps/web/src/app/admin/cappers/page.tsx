import { db, cappers } from "@graded/db";
import { desc } from "drizzle-orm";
import { createCapper, toggleCapperActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function CappersPage() {
  const rows = await db.select().from(cappers).orderBy(desc(cappers.createdAt));

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <a href="/admin" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Admin
      </a>
      <h1 className="mt-2 text-xl font-semibold">Cappers</h1>

      <form action={createCapper} className="mt-6 grid max-w-lg gap-3">
        <input
          name="display_name"
          placeholder="Display name"
          required
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <input
          name="slug"
          placeholder="Slug (optional — derived from name if blank)"
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <input
          name="bio"
          placeholder="Bio (optional)"
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <input
          name="avatar_url"
          placeholder="Avatar URL (optional)"
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          className="w-fit rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900"
        >
          Add capper
        </button>
      </form>

      <table className="mt-8 w-full max-w-3xl text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-neutral-400">
            <th className="py-2">Name</th>
            <th>Slug</th>
            <th>Active</th>
            <th>Profile</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b border-neutral-900">
              <td className="py-2">{c.displayName}</td>
              <td className="text-neutral-400">{c.slug}</td>
              <td>
                <form
                  action={toggleCapperActive.bind(null, c.id, !c.isActive)}
                >
                  <button
                    type="submit"
                    className={c.isActive ? "text-green-400" : "text-neutral-500"}
                  >
                    {c.isActive ? "active" : "inactive"}
                  </button>
                </form>
              </td>
              <td>
                <a
                  href={`/capper/${c.slug}`}
                  className="text-neutral-400 underline hover:text-neutral-200"
                >
                  view
                </a>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-neutral-500">
                No cappers yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

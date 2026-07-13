import { notFound } from "next/navigation";
import { db, cappers, picks } from "@graded/db";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function CapperProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [capper] = await db.select().from(cappers).where(eq(cappers.slug, slug)).limit(1);
  if (!capper) notFound();

  const capperPicks = await db
    .select()
    .from(picks)
    .where(eq(picks.capperId, capper.id))
    .orderBy(desc(picks.postedAt));

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <a href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Graded
      </a>
      <h1 className="mt-2 text-xl font-semibold">{capper.displayName}</h1>
      {capper.bio && <p className="mt-1 text-sm text-neutral-400">{capper.bio}</p>}

      <table className="mt-8 w-full max-w-3xl text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-neutral-400">
            <th className="py-2">Date</th>
            <th>Event</th>
            <th>Pick</th>
            <th>Units</th>
            <th>Status</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {capperPicks.map((p) => (
            <tr key={p.id} className="border-b border-neutral-900">
              <td className="py-2 text-neutral-400">
                {new Date(p.postedAt).toLocaleDateString()}
              </td>
              <td>{p.eventDesc}</td>
              <td>
                {p.side}
                {p.line ? ` ${p.line}` : ""}
                {p.oddsAmerican ? ` (${p.oddsAmerican > 0 ? "+" : ""}${p.oddsAmerican})` : ""}
              </td>
              <td>{p.units}</td>
              <td className="text-neutral-400">{p.status}</td>
              <td className="text-neutral-400">{p.result}</td>
            </tr>
          ))}
          {capperPicks.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-neutral-500">
                No picks tracked yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

import { db, adminAudit } from "@graded/db";
import { and, desc, eq, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const links = [
    { href: "/admin/review", label: "Review queue" },
    { href: "/admin/match", label: "Match picks to events" },
    { href: "/admin/cappers", label: "Cappers" },
    { href: "/admin/sources", label: "Sources" },
    { href: "/admin/ingest", label: "Manual ingest" },
  ];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [pausedEvent] = await db
    .select()
    .from(adminAudit)
    .where(and(eq(adminAudit.action, "cost_guardrail_paused"), gte(adminAudit.at, since)))
    .orderBy(desc(adminAudit.at))
    .limit(1);

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <h1 className="text-xl font-semibold">Graded Admin</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Health panel and grading tools land in later milestones.
      </p>
      {pausedEvent && (
        <div className="mt-4 max-w-lg rounded border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
          Parse queue paused as of {new Date(pausedEvent.at).toLocaleString()} — projected
          monthly Anthropic spend exceeded the $25 budget. New picks stay pending until spend
          drops back under budget or the cap is raised.
        </div>
      )}
      <nav className="mt-6 flex flex-col gap-2">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="w-fit text-sm text-neutral-300 underline hover:text-neutral-100"
          >
            {l.label}
          </a>
        ))}
      </nav>
    </main>
  );
}

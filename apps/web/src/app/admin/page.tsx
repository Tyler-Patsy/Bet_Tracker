export default function AdminHome() {
  const links = [
    { href: "/admin/review", label: "Review queue" },
    { href: "/admin/cappers", label: "Cappers" },
    { href: "/admin/sources", label: "Sources" },
    { href: "/admin/ingest", label: "Manual ingest" },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <h1 className="text-xl font-semibold">Graded Admin</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Health panel and grading tools land in later milestones.
      </p>
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

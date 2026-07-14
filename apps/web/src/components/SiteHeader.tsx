import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-8">
        <Link
          href="/"
          className="font-display text-2xl font-bold uppercase tracking-wide text-neutral-100"
        >
          Graded<span className="text-amber-400">.</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-neutral-400 sm:gap-6">
          <Link href="/leaderboard" className="hover:text-neutral-100">
            Leaderboard
          </Link>
          <Link href="/methodology" className="hover:text-neutral-100">
            Methodology
          </Link>
          <Link href="/about" className="hidden hover:text-neutral-100 sm:block">
            About
          </Link>
          <Link
            href="/submit"
            className="rounded-sm border border-neutral-700 px-3 py-1.5 text-neutral-200 hover:border-neutral-500 hover:text-neutral-50"
          >
            Submit a capper
          </Link>
        </nav>
      </div>
    </header>
  );
}

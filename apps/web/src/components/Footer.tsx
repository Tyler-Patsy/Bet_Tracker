import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="font-display text-xl font-bold uppercase tracking-wide text-neutral-100">
              Graded<span className="text-amber-400">.</span>
            </span>
            <p className="mt-1 text-xs text-neutral-500">
              Every pick tracked. Every deletion counted.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-400">
            <Link href="/leaderboard" className="hover:text-neutral-100">
              Leaderboard
            </Link>
            <Link href="/methodology" className="hover:text-neutral-100">
              Methodology
            </Link>
            <Link href="/about" className="hover:text-neutral-100">
              About
            </Link>
            <Link href="/submit" className="hover:text-neutral-100">
              Submit a capper
            </Link>
          </nav>
        </div>
        <p className="text-xs leading-relaxed text-neutral-600">
          21+. Graded tracks publicly posted picks for entertainment and information. It is not
          betting advice, and Graded never recommends a pick. Gambling problem? Call
          1-800-GAMBLER.
        </p>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "What Graded is, what it isn't, and why it exists.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight">About</h1>

      <section className="mt-6 space-y-4 text-sm leading-relaxed text-neutral-300">
        <p>
          Sports betting content has an accountability problem. Cappers post picks in
          public, then grade themselves — deleting the losses, screenshotting the wins,
          and selling subscriptions off records nobody can check. The people tailing
          those picks aren&apos;t gullible; they just have no way to verify anything.
        </p>
        <p>
          Graded is the referee. It captures free, publicly posted picks the moment they
          go up, grades them against final scores, and keeps them on the record
          permanently. If a capper deletes a losing pick, it stays — marked, counted,
          and visible on their profile. See{" "}
          <Link href="/methodology" className="underline underline-offset-4 hover:text-neutral-100">
            Methodology
          </Link>{" "}
          for the full rulebook.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-neutral-100">
          What Graded is not
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-neutral-300">
          <li className="border-l-2 border-neutral-800 pl-4">
            <strong className="text-neutral-100">Not a tout.</strong> Graded never
            recommends a pick, and never will.
          </li>
          <li className="border-l-2 border-neutral-800 pl-4">
            <strong className="text-neutral-100">Not an affiliate.</strong> No sportsbook
            signup links, no odds boosts, no kickbacks.
          </li>
          <li className="border-l-2 border-neutral-800 pl-4">
            <strong className="text-neutral-100">Not a hype machine.</strong> A hot streak
            gets the same font size as a cold one.
          </li>
        </ul>
      </section>
    </main>
  );
}

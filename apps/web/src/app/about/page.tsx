import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Graded",
  description: "What Graded is and isn't.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <a href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Graded
      </a>
      <h1 className="mt-2 text-2xl font-semibold">About</h1>
      <p className="mt-4 text-sm leading-relaxed text-neutral-300">
        Graded tracks free sports picks posted publicly by cappers on Telegram,
        Reddit, and X, and grades them against real results — automatically, and
        permanently. If a capper deletes a losing pick, it stays on their record.
        See <a href="/methodology" className="underline">Methodology</a> for exactly
        how grading works.
      </p>
    </main>
  );
}

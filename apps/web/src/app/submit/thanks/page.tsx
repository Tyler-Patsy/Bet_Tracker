import Link from "next/link";

export default function SubmitThanksPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-8">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight">Received.</h1>
      <p className="mt-2 text-sm text-neutral-400">
        We&apos;ll take a look. If they&apos;re a fit, their record starts building on{" "}
        <Link href="/leaderboard" className="underline underline-offset-4 hover:text-neutral-200">
          the board
        </Link>
        .
      </p>
    </main>
  );
}

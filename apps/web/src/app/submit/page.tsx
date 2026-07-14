import type { Metadata } from "next";
import { submitCapper } from "./actions";

export const metadata: Metadata = {
  title: "Suggest a capper — Graded",
  description: "Suggest a capper for Graded to track.",
};

export default function SubmitPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-8">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight">Suggest a capper</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Know a capper posting free picks on a public Telegram channel, Reddit, or X
        who should be tracked? Tell us who and where.
      </p>

      <form action={submitCapper} className="mt-6 grid gap-3">
        {/* Honeypot — hidden from real users via CSS, not display:none (some bots skip those) */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
          aria-hidden="true"
        />
        <input
          name="name"
          placeholder="Capper name or handle"
          required
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <input
          name="link"
          placeholder="Link to their channel/profile"
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <textarea
          name="why"
          placeholder="Why should we track them? (optional)"
          rows={3}
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          className="w-fit rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900"
        >
          Submit
        </button>
      </form>
    </main>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology — Graded",
  description: "How Graded grades picks, and why the numbers can be trusted.",
};

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <a href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Graded
      </a>
      <h1 className="mt-2 text-2xl font-semibold">Methodology</h1>
      <p className="mt-2 text-neutral-400">
        This page is the whole rulebook. If a number on this site doesn&apos;t match
        what you&apos;d compute yourself from a capper&apos;s public post, that&apos;s a bug —
        email us (below) and we&apos;ll fix it.
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-neutral-200">
        <h2 className="text-lg font-semibold text-neutral-100">The rules</h2>

        <p>
          <strong>Nothing is deleted.</strong> The moment we see a post, we save the
          exact text and any image, before we even try to figure out if it&apos;s a
          pick. That copy never goes away.
        </p>
        <p>
          <strong>Deleting a pick doesn&apos;t remove it from the record.</strong> If a
          capper deletes a message after we&apos;ve logged a pick from it, the pick
          stays on their record, marked as deleted. Every profile shows a running
          count of deletions.
        </p>
        <p>
          <strong>No number, no grade.</strong> A post like &quot;Lakers tonight 🔒&quot; with
          no line or odds doesn&apos;t affect anyone&apos;s record — there&apos;s nothing to
          grade.
        </p>
        <p>
          <strong>We grade the odds actually posted.</strong> Never a sportsbook&apos;s
          current line — whatever number the capper wrote. If a spread or total
          pick didn&apos;t include odds, we assume standard -110 and say so on the
          pick (flagged &quot;assumed odds&quot;). A moneyline pick with no odds can&apos;t be
          graded at all — there&apos;s no way to compute a payout — so it&apos;s excluded,
          not guessed at.
        </p>
        <p>
          <strong>A pick has to be posted before the game starts.</strong> Anything
          timestamped after the game&apos;s scheduled start doesn&apos;t count — we still
          show it, flagged, but it&apos;s excluded from the record. This is the single
          biggest way a capper could fake a record, so we check every pick against
          the actual game time.
        </p>
        <p>
          <strong>Edits are tracked, not trusted.</strong> If a capper edits a pick
          after the game has started, we grade the <em>original</em> version, not
          the edit — and flag it so you can see it happened.
        </p>
        <p>
          <strong>Duplicate posts only count once.</strong> The same capper posting
          the same side of the same game more than once in a day only counts the
          first time.
        </p>
        <p>
          <strong>Every stat is reproducible.</strong> Every number on this site
          traces back to an archived post. Nothing here comes from us grading a
          capper&apos;s &quot;vibe&quot; — it&apos;s all arithmetic on public posts.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-100">How a pick gets graded</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="py-2 pr-4">Bet type</th>
                <th>Rule</th>
              </tr>
            </thead>
            <tbody className="text-neutral-300">
              <tr className="border-b border-neutral-900">
                <td className="py-2 pr-4">Spread</td>
                <td>Margin plus the line; exactly zero is a push.</td>
              </tr>
              <tr className="border-b border-neutral-900">
                <td className="py-2 pr-4">Total</td>
                <td>Combined score above the number wins the over, below wins the under, exactly on the number is a push.</td>
              </tr>
              <tr className="border-b border-neutral-900">
                <td className="py-2 pr-4">Moneyline (NFL/NBA/MLB/NHL)</td>
                <td>Includes overtime/extra innings. Whoever wins the game wins the bet.</td>
              </tr>
              <tr className="border-b border-neutral-900">
                <td className="py-2 pr-4">Moneyline (soccer, standard)</td>
                <td>90 minutes plus stoppage time only. A draw is a loss for either team&apos;s moneyline.</td>
              </tr>
              <tr className="border-b border-neutral-900">
                <td className="py-2 pr-4">Moneyline (soccer, draw no bet)</td>
                <td>A draw pushes — you get your stake back.</td>
              </tr>
              <tr className="border-b border-neutral-900">
                <td className="py-2 pr-4">Puck line / run line</td>
                <td>Same math as a spread, using the final score including overtime/extra innings.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Postponed or canceled game</td>
                <td>Voided — no win, no loss, no effect on the record.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-neutral-500">
          Player props, futures, and in-game/live bets aren&apos;t graded in v1 — they&apos;re
          logged but excluded from records.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-100">Something looks wrong?</h2>
        <p className="mt-2 text-sm text-neutral-300">
          Every stat here should be reproducible from a capper&apos;s own public post. If
          you think a pick was graded incorrectly, or a capper&apos;s record looks off,
          tell us:{" "}
          <a href="mailto:disputes@graded.example" className="underline">
            disputes@graded.example
          </a>
          .
        </p>
      </section>
    </main>
  );
}

import FlagBadges from "./FlagBadges";

export interface PendingPick {
  id: number;
  postedAt: Date;
  eventDesc: string;
  market: string;
  side: string;
  line: string | null;
  oddsAmerican: number | null;
  units: string;
  flags: string[];
}

// Public in v1. This becomes the paid gate in v2 — keep everything that
// decides visibility inside this one component so gating it later is a
// one-file change.
export default function PendingPicks({ picks }: { picks: PendingPick[] }) {
  if (picks.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Pending picks</h2>
      <div className="mt-3 flex flex-col gap-2">
        {picks.map((p) => (
          <div key={p.id} className="rounded border border-neutral-800 bg-neutral-900 p-3 text-sm">
            <div className="flex items-baseline justify-between">
              <span>{p.eventDesc}</span>
              <span className="text-neutral-400">{new Date(p.postedAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-1 text-neutral-400">
              {p.side}
              {p.line ? ` ${p.line}` : ""}
              {p.oddsAmerican ? ` (${p.oddsAmerican > 0 ? "+" : ""}${p.oddsAmerican})` : ""} · {p.units}u
            </div>
            {p.flags.length > 0 && (
              <div className="mt-1">
                <FlagBadges flags={p.flags} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

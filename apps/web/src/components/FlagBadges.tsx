const FLAG_LABELS: Record<string, string> = {
  deleted_by_capper: "DELETED",
  edited_after_start: "EDITED AFTER START",
  posted_after_start: "POSTED AFTER START",
  assumed_odds: "ASSUMED ODDS",
  duplicate: "DUPLICATE",
};

export default function FlagBadges({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <span
          key={f}
          className="rounded bg-amber-900/50 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-amber-300"
        >
          {FLAG_LABELS[f] ?? f.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

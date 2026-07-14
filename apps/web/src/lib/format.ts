export function formatUnits(n: number | string | null): string {
  if (n === null) return "—";
  const v = Number(n);
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}u`;
}

export function unitsColorClass(n: number | string | null): string {
  if (n === null) return "text-neutral-400";
  const v = Number(n);
  if (v > 0) return "text-green-400";
  if (v < 0) return "text-red-400";
  return "text-neutral-400";
}

export function formatPct(n: number | string | null): string {
  if (n === null) return "—";
  return `${(Number(n) * 100).toFixed(1)}%`;
}

export function formatStreak(n: number | null): string {
  if (n === null || n === 0) return "—";
  return n > 0 ? `W${n}` : `L${Math.abs(n)}`;
}

export function formatDollars(n: number | string | null): string {
  if (n === null) return "—";
  const v = Number(n);
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toFixed(0)}`;
}

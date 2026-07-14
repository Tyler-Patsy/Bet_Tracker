// Letter grade for a capper, derived from ROI. Presentational only — never
// stored, always recomputed from capper_stats so it can't drift from the data.
// Thresholds are documented on /methodology; change them there too.

export const MIN_GRADED_TO_RANK = 20;

export function gradeFor(roi: number | string | null, gradedPicks: number | null): string | null {
  if ((gradedPicks ?? 0) < MIN_GRADED_TO_RANK || roi === null) return null;
  const r = Number(roi);
  if (r >= 0.15) return "A+";
  if (r >= 0.08) return "A";
  if (r >= 0.03) return "B";
  if (r >= -0.03) return "C";
  if (r >= -0.1) return "D";
  return "F";
}

export function gradeColorClass(grade: string | null): string {
  if (grade === null) return "border-neutral-800 text-neutral-500";
  if (grade.startsWith("A")) return "border-green-400/40 text-green-400";
  if (grade === "B") return "border-neutral-200/40 text-neutral-200";
  if (grade === "C") return "border-neutral-500/40 text-neutral-400";
  return "border-red-400/40 text-red-400"; // D, F
}

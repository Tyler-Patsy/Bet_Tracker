import { gradeColorClass } from "@/lib/grade";

// The grade stamp — boxed letter grade, the brand mark in action (BRAND.md §4).
// `grade` is null until a capper has enough graded picks; render a quiet
// placeholder so layouts don't shift when the grade arrives.
export default function GradeBadge({
  grade,
  size = "sm",
}: {
  grade: string | null;
  size?: "sm" | "lg";
}) {
  const sizing =
    size === "lg"
      ? "h-10 w-10 text-xl"
      : "h-6 w-6 text-xs";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-sm border font-display font-bold ${sizing} ${gradeColorClass(grade)}`}
      title={grade ? `Grade ${grade} — ROI-based, see methodology` : "Not enough graded picks yet"}
    >
      {grade ?? "–"}
    </span>
  );
}

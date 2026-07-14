import { gte, sql } from "drizzle-orm";
import { db, llmUsage } from "@graded/db";
import type { ParseUsage } from "@graded/parser";

// Per-million-token pricing. Sonnet 5 intro pricing runs through 2026-08-31;
// revisit this table after that date. (See BUILD_SPEC.md §16 cost guardrail.)
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-sonnet-5": { input: 2.0, output: 10.0 },
};

const MONTHLY_BUDGET_USD = 25;

function costFor(usage: ParseUsage): number {
  const price = PRICING_PER_MTOK[usage.model];
  if (!price) return 0;
  return (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000;
}

export async function recordUsage(usage: ParseUsage, rawMessageId: number): Promise<void> {
  await db.insert(llmUsage).values({
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: costFor(usage).toFixed(6),
    rawMessageId,
  });
}

// Projects month-to-date spend to a full-month estimate. Pausing early in the
// month on a single expensive burst is a false positive we accept — better to
// pause and let a human check than blow past the budget silently (§16).
export async function checkCostGuardrail(): Promise<{ paused: boolean; monthToDateUsd: number; projectedUsd: number }> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const dayOfMonth = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();

  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${llmUsage.costUsd}), 0)` })
    .from(llmUsage)
    .where(gte(llmUsage.createdAt, monthStart));

  const monthToDateUsd = Number(row?.total ?? 0);
  const projectedUsd = (monthToDateUsd / dayOfMonth) * daysInMonth;

  return { paused: projectedUsd > MONTHLY_BUDGET_USD, monthToDateUsd, projectedUsd };
}

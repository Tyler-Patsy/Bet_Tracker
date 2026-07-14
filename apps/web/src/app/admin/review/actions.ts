"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, rawMessages, sources, picks } from "@graded/db";
import { logAudit } from "@/lib/audit";

async function loadRawMessage(rawMessageId: number) {
  const [row] = await db
    .select({
      id: rawMessages.id,
      postedAt: rawMessages.postedAt,
      capperId: sources.capperId,
    })
    .from(rawMessages)
    .innerJoin(sources, eq(rawMessages.sourceId, sources.id))
    .where(eq(rawMessages.id, rawMessageId))
    .limit(1);
  if (!row) throw new Error("Raw message not found");
  return row;
}

export async function createPickFromRawMessage(formData: FormData) {
  const rawMessageId = Number(formData.get("raw_message_id"));
  const intent = String(formData.get("intent") ?? "accept"); // "accept" | "ungradeable"
  const sport = String(formData.get("sport") ?? "");
  const league = String(formData.get("league") ?? "").trim() || null;
  const eventDesc = String(formData.get("event_desc") ?? "").trim();
  const market = String(formData.get("market") ?? "");
  const side = String(formData.get("side") ?? "").trim();
  const lineRaw = String(formData.get("line") ?? "").trim();
  const oddsRaw = String(formData.get("odds_american") ?? "").trim();
  const unitsRaw = String(formData.get("units") ?? "1").trim();
  const stakeConvention = String(formData.get("stake_convention") ?? "risk");
  const mlVariant = String(formData.get("ml_variant") ?? "").trim() || null;

  if (!rawMessageId) throw new Error("Missing raw message");
  if (!eventDesc || !side) throw new Error("Event and side are required");
  if (intent === "accept" && market === "moneyline" && !oddsRaw) {
    // §2.4: a moneyline pick with no stated odds can't have its payout computed —
    // it's ungradeable, not accepted, no exceptions.
    throw new Error("Moneyline picks require odds — mark ungradeable instead if none were posted");
  }

  const raw = await loadRawMessage(rawMessageId);

  const [pick] = await db
    .insert(picks)
    .values({
      rawMessageId: raw.id,
      capperId: raw.capperId,
      sport,
      league,
      eventDesc,
      market,
      side,
      line: lineRaw || null,
      oddsAmerican: oddsRaw ? Number(oddsRaw) : null,
      units: unitsRaw || "1",
      stakeConvention,
      mlVariant,
      postedAt: raw.postedAt,
      status: intent === "ungradeable" ? "ungradeable" : "accepted",
      result: "pending",
    })
    .returning({ id: picks.id });

  await db
    .update(rawMessages)
    .set({ parseStatus: "parsed" })
    .where(eq(rawMessages.id, raw.id));

  await logAudit(intent === "ungradeable" ? "mark_ungradeable" : "accept_pick", "pick", pick.id, {
    rawMessageId: raw.id,
  });
  revalidatePath("/admin/review");
}

export async function markNoPicks(rawMessageId: number) {
  await db
    .update(rawMessages)
    .set({ parseStatus: "no_picks" })
    .where(eq(rawMessages.id, rawMessageId));
  await logAudit("mark_no_picks", "raw_message", rawMessageId, {});
  revalidatePath("/admin/review");
}

// Decides a parser-created pending_review pick: Accept (with any edits the
// admin made) / Reject (parser got it wrong) / Mark ungradeable.
export async function decidePick(formData: FormData) {
  const pickId = Number(formData.get("pick_id"));
  const intent = String(formData.get("intent") ?? "accept"); // accept | reject | ungradeable
  const sport = String(formData.get("sport") ?? "");
  const league = String(formData.get("league") ?? "").trim() || null;
  const eventDesc = String(formData.get("event_desc") ?? "").trim();
  const market = String(formData.get("market") ?? "");
  const side = String(formData.get("side") ?? "").trim();
  const lineRaw = String(formData.get("line") ?? "").trim();
  const oddsRaw = String(formData.get("odds_american") ?? "").trim();
  const unitsRaw = String(formData.get("units") ?? "1").trim();
  const stakeConvention = String(formData.get("stake_convention") ?? "risk");
  const mlVariant = String(formData.get("ml_variant") ?? "").trim() || null;
  const eventIdRaw = String(formData.get("event_id") ?? "").trim();

  if (!pickId) throw new Error("Missing pick");
  if (intent === "accept") {
    if (!eventDesc || !side) throw new Error("Event and side are required");
    if (market === "moneyline" && !oddsRaw) {
      throw new Error("Moneyline picks require odds — mark ungradeable instead if none were posted");
    }
    if (!eventIdRaw) throw new Error("Link an event before accepting");
  }

  const status = intent === "reject" ? "rejected" : intent === "ungradeable" ? "ungradeable" : "accepted";

  await db
    .update(picks)
    .set({
      sport,
      league,
      eventDesc,
      market,
      side,
      line: lineRaw || null,
      oddsAmerican: oddsRaw ? Number(oddsRaw) : null,
      units: unitsRaw || "1",
      stakeConvention,
      mlVariant,
      eventId: eventIdRaw ? Number(eventIdRaw) : null,
      status,
    })
    .where(eq(picks.id, pickId));

  await logAudit(`review_${intent}`, "pick", pickId, {});
  revalidatePath("/admin/review");
}

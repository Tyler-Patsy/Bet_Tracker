"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, cappers, rawMessages } from "@graded/db";
import { getOrCreateManualSource } from "@/lib/sources";
import { logAudit } from "@/lib/audit";

export async function createManualIngest(formData: FormData) {
  const capperId = Number(formData.get("capper_id"));
  const postedAtRaw = String(formData.get("posted_at") ?? "");
  const tweetUrl = String(formData.get("tweet_url") ?? "").trim();
  const pickText = String(formData.get("pick_text") ?? "").trim();
  const screenshot = formData.get("screenshot") as File | null;

  if (!capperId) throw new Error("Capper is required");
  if (!postedAtRaw) throw new Error("Posted-at is required");
  if (!pickText && (!screenshot || screenshot.size === 0)) {
    throw new Error("Provide pick text, a screenshot, or both");
  }

  const postedAt = new Date(postedAtRaw);
  if (Number.isNaN(postedAt.getTime())) throw new Error("Invalid posted-at timestamp");

  const [capper] = await db.select().from(cappers).where(eq(cappers.id, capperId)).limit(1);
  if (!capper) throw new Error("Capper not found");

  const source = await getOrCreateManualSource(capper.id, capper.slug);

  const media: Array<Record<string, unknown>> = [];
  if (tweetUrl) media.push({ type: "tweet_url", url: tweetUrl });
  if (screenshot && screenshot.size > 0) {
    const buffer = Buffer.from(await screenshot.arrayBuffer());
    media.push({
      type: "photo",
      filename: screenshot.name,
      contentType: screenshot.type,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      dataUrl: `data:${screenshot.type};base64,${buffer.toString("base64")}`,
    });
  }

  const [raw] = await db
    .insert(rawMessages)
    .values({
      sourceId: source.id,
      externalId: randomUUID(),
      postedAt,
      text: pickText || null,
      media,
    })
    .returning({ id: rawMessages.id });

  await logAudit("manual_ingest", "raw_message", raw.id, { capperId: capper.id });
  revalidatePath("/admin/review");
  redirect("/admin/review");
}

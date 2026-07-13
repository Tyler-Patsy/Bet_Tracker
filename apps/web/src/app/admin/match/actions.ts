"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, picks } from "@graded/db";
import { logAudit } from "@/lib/audit";

export async function linkPickToEvent(formData: FormData) {
  const pickId = Number(formData.get("pick_id"));
  const eventId = Number(formData.get("event_id"));
  if (!pickId || !eventId) throw new Error("Missing pick or event");

  await db.update(picks).set({ eventId }).where(eq(picks.id, pickId));
  await logAudit("link_event", "pick", pickId, { eventId });
  revalidatePath("/admin/match");
}

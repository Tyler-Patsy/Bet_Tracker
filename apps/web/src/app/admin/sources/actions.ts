"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, sources } from "@graded/db";
import { logAudit } from "@/lib/audit";

export async function createSource(formData: FormData) {
  const capperId = Number(formData.get("capper_id"));
  const kind = String(formData.get("kind") ?? "");
  const handle = String(formData.get("handle") ?? "").trim();

  if (!capperId) throw new Error("Capper is required");
  if (!["telegram", "reddit", "x_manual"].includes(kind)) {
    throw new Error("Invalid source kind");
  }
  if (!handle) throw new Error("Handle is required");

  const [source] = await db
    .insert(sources)
    .values({ capperId, kind, handle })
    .returning({ id: sources.id });

  await logAudit("create_source", "source", source.id, { capperId, kind, handle });
  revalidatePath("/admin/sources");
}

export async function toggleSourceActive(sourceId: number, isActive: boolean) {
  await db.update(sources).set({ isActive }).where(eq(sources.id, sourceId));
  await logAudit("toggle_source_active", "source", sourceId, { isActive });
  revalidatePath("/admin/sources");
}

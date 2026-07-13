"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, cappers } from "@graded/db";
import { slugify } from "@/lib/slug";
import { logAudit } from "@/lib/audit";

export async function createCapper(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim() || null;

  if (!displayName) throw new Error("Display name is required");
  const slug = slugify(rawSlug || displayName);
  if (!slug) throw new Error("Could not derive a slug from that name");

  const [capper] = await db
    .insert(cappers)
    .values({ displayName, slug, bio, avatarUrl })
    .returning({ id: cappers.id });

  await logAudit("create_capper", "capper", capper.id, { displayName, slug });
  revalidatePath("/admin/cappers");
}

export async function toggleCapperActive(capperId: number, isActive: boolean) {
  await db.update(cappers).set({ isActive }).where(eq(cappers.id, capperId));
  await logAudit("toggle_capper_active", "capper", capperId, { isActive });
  revalidatePath("/admin/cappers");
}

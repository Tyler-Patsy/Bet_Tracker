import { and, eq } from "drizzle-orm";
import { db, sources } from "@graded/db";
import { slugify } from "@/lib/slug";

export async function getOrCreateManualSource(capperId: number, capperSlug: string) {
  const handle = `manual:${slugify(capperSlug)}`;
  const existing = await db
    .select()
    .from(sources)
    .where(and(eq(sources.capperId, capperId), eq(sources.kind, "x_manual")))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(sources)
    .values({ capperId, kind: "x_manual", handle })
    .returning();
  return created;
}

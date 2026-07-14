import type { MetadataRoute } from "next";
import { db, cappers } from "@graded/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  const activeCappers = await db
    .select({ slug: cappers.slug })
    .from(cappers)
    .where(eq(cappers.isActive, true));

  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/methodology`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/submit`, changeFrequency: "monthly", priority: 0.3 },
    ...activeCappers.map((c) => ({
      url: `${base}/capper/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}

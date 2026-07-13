import { db, adminAudit } from "@graded/db";

export async function logAudit(
  action: string,
  entity: string,
  entityId: number | null,
  detail: Record<string, unknown> = {}
) {
  await db.insert(adminAudit).values({ action, entity, entityId, detail });
}

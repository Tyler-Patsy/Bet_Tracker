import pino from "pino";
import { db, workerHeartbeat } from "@graded/db";
import { sql } from "drizzle-orm";

const log = pino({ name: "worker" });

async function beat() {
  await db
    .insert(workerHeartbeat)
    .values({ id: 1 })
    .onConflictDoUpdate({
      target: workerHeartbeat.id,
      set: { updatedAt: sql`now()` },
    });
}

async function main() {
  log.info("worker booting (M0 skeleton — Telegram listener lands in M4)");
  await beat();
  setInterval(() => {
    beat().catch((err) => log.error({ err }, "heartbeat failed"));
  }, 60_000);
}

main().catch((err) => {
  log.error({ err }, "worker crashed");
  process.exit(1);
});

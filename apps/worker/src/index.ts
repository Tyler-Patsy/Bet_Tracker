import pino from "pino";
import PgBoss from "pg-boss";
import { sql } from "drizzle-orm";
import { db, workerHeartbeat } from "@graded/db";
import { syncEvents, todayAndTomorrow } from "./jobs/sync-events";
import { liveSync } from "./jobs/live-sync";
import { gradeEvent } from "./jobs/grade-event";

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

async function startJobs() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const boss = new PgBoss(connectionString);
  boss.on("error", (err) => log.error({ err }, "pg-boss error"));
  await boss.start();

  await boss.createQueue("daily-schedule");
  await boss.createQueue("live-sync");
  await boss.createQueue("grade-event");

  await boss.schedule("daily-schedule", "0 6 * * *", {}, { tz: "America/New_York" });
  await boss.schedule("live-sync", "*/10 * * * *");

  await boss.work("daily-schedule", async () => {
    await syncEvents(todayAndTomorrow(), log);
  });

  await boss.work("live-sync", async () => {
    await liveSync(boss, log);
  });

  await boss.work<{ eventId: number }>("grade-event", async (jobs) => {
    for (const job of jobs) {
      await gradeEvent(job.data.eventId, log);
    }
  });

  log.info("pg-boss jobs registered: daily-schedule, live-sync, grade-event");
  return boss;
}

async function main() {
  log.info("worker booting (Telegram listener lands in M4)");
  await beat();
  setInterval(() => {
    beat().catch((err) => log.error({ err }, "heartbeat failed"));
  }, 60_000);

  await startJobs();
}

main().catch((err) => {
  log.error({ err }, "worker crashed");
  process.exit(1);
});

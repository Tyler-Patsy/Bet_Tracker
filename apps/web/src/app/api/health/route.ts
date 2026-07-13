import { NextResponse } from "next/server";
import { db, workerHeartbeat } from "@graded/db";

const STALE_AFTER_MS = 5 * 60 * 1000;

export async function GET() {
  try {
    const rows = await db.select().from(workerHeartbeat).limit(1);
    const lastBeat = rows[0]?.updatedAt ?? null;
    const workerStale = !lastBeat || Date.now() - new Date(lastBeat).getTime() > STALE_AFTER_MS;

    return NextResponse.json(
      {
        ok: !workerStale,
        db: "ok",
        worker: workerStale ? "stale" : "ok",
        lastHeartbeat: lastBeat,
      },
      { status: workerStale ? 503 : 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: "error", error: (err as Error).message },
      { status: 503 }
    );
  }
}

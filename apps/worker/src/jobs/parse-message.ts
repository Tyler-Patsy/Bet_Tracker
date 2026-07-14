import { and, desc, eq, ne } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db, rawMessages, sources, picks, adminAudit } from "@graded/db";
import { parsePost, type ParseImage } from "@graded/parser";
import type { Logger } from "pino";
import { matchEvent } from "./match-event";
import { recordUsage, checkCostGuardrail } from "./llm-cost";

function extractImages(media: unknown): ParseImage[] {
  if (!Array.isArray(media)) return [];
  const images: ParseImage[] = [];
  for (const entry of media as Array<Record<string, unknown>>) {
    if (entry.type !== "photo" || typeof entry.dataUrl !== "string") continue;
    const match = entry.dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (!match) continue;
    const mediaType = match[1];
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType)) continue;
    images.push({ mediaType: mediaType as ParseImage["mediaType"], base64Data: match[2] });
    if (images.length >= 3) break;
  }
  return images;
}

function buildEventDesc(away: string | null, home: string | null, hint: string | null): string {
  const teams = away && home ? `${away} @ ${home}` : away || home || "Unknown matchup";
  return hint ? `${teams} (${hint})` : teams;
}

async function isDuplicate(capperId: number, eventId: number, market: string, side: string) {
  const existing = await db
    .select()
    .from(picks)
    .where(
      and(
        eq(picks.capperId, capperId),
        eq(picks.eventId, eventId),
        eq(picks.market, market),
        eq(picks.side, side),
        ne(picks.status, "rejected")
      )
    )
    .limit(1);
  return existing.length > 0;
}

// Polls for raw_messages the parser hasn't touched yet. Manual ingest (and,
// from M4, the Telegram listener) just writes rows with parse_status='pending'
// — this sweep is what actually turns them into picks, since the web app has
// no pg-boss connection of its own.
export async function sweepPendingMessages(client: Anthropic, log: Logger, limit = 20): Promise<number> {
  const pending = await db
    .select({ id: rawMessages.id })
    .from(rawMessages)
    .where(eq(rawMessages.parseStatus, "pending"))
    .limit(limit);

  for (const row of pending) {
    await parseRawMessage(row.id, client, log);
  }
  return pending.length;
}

export async function parseRawMessage(
  rawMessageId: number,
  client: Anthropic,
  log: Logger
): Promise<void> {
  const guardrail = await checkCostGuardrail();
  if (guardrail.paused) {
    log.warn(guardrail, "parse queue paused: projected monthly Anthropic spend exceeds budget");
    await db.insert(adminAudit).values({
      action: "cost_guardrail_paused",
      entity: "raw_message",
      entityId: rawMessageId,
      detail: guardrail,
    });
    return; // leave parse_status='pending' — picked up again once under budget
  }

  const [raw] = await db
    .select({
      id: rawMessages.id,
      text: rawMessages.text,
      media: rawMessages.media,
      postedAt: rawMessages.postedAt,
      capperId: sources.capperId,
    })
    .from(rawMessages)
    .innerJoin(sources, eq(rawMessages.sourceId, sources.id))
    .where(eq(rawMessages.id, rawMessageId))
    .limit(1);
  if (!raw) return;

  try {
    const recentPicks = await db
      .select({ sport: picks.sport })
      .from(picks)
      .where(eq(picks.capperId, raw.capperId))
      .orderBy(desc(picks.createdAt))
      .limit(20);
    const capperSportTendencies = [...new Set(recentPicks.map((p) => p.sport))];

    const result = await parsePost(client, {
      text: raw.text ?? "",
      images: extractImages(raw.media),
      capperSportTendencies,
    });

    for (const usage of result.usages) {
      await recordUsage(usage, raw.id);
    }

    if (result.response.picks.length === 0) {
      await db
        .update(rawMessages)
        .set({ parseStatus: "no_picks" })
        .where(eq(rawMessages.id, raw.id));
      return;
    }

    for (const parsed of result.response.picks) {
      const flags: string[] = [];
      let eventId: number | null = null;

      if (parsed.gradeable) {
        const match = await matchEvent({
          sport: parsed.sport,
          league: parsed.league,
          awayTeamRaw: parsed.away_team,
          homeTeamRaw: parsed.home_team,
          postedAt: raw.postedAt,
        });

        if (match.status === "matched") {
          eventId = match.event.id;
          if (raw.postedAt > match.event.startAt) {
            flags.push("posted_after_start");
          }
          if (await isDuplicate(raw.capperId, eventId, parsed.market, parsed.side)) {
            flags.push("duplicate");
          }
        }
      }

      const blockingFlags = flags.some((f) => f === "posted_after_start" || f === "duplicate");
      let status: "accepted" | "pending_review" | "ungradeable";
      if (!parsed.gradeable) {
        status = "ungradeable";
      } else if (eventId && parsed.confidence >= 0.85 && !blockingFlags) {
        status = "accepted";
      } else {
        status = "pending_review";
      }

      await db.insert(picks).values({
        rawMessageId: raw.id,
        capperId: raw.capperId,
        eventId,
        sport: parsed.sport,
        league: parsed.league,
        eventDesc: buildEventDesc(parsed.away_team, parsed.home_team, parsed.event_hint),
        market: parsed.market,
        side: parsed.side,
        line: parsed.line == null ? null : String(parsed.line),
        oddsAmerican: parsed.odds_american,
        units: String(parsed.units ?? 1),
        stakeConvention: parsed.stake_convention ?? "risk",
        mlVariant: parsed.ml_variant,
        postedAt: raw.postedAt,
        status,
        result: "pending",
        confidence: String(parsed.confidence),
        flags,
        parserQuote: parsed.quote,
      });
    }

    await db.update(rawMessages).set({ parseStatus: "parsed" }).where(eq(rawMessages.id, raw.id));
  } catch (err) {
    log.error({ err, rawMessageId }, "parse failed");
    await db.update(rawMessages).set({ parseStatus: "error" }).where(eq(rawMessages.id, raw.id));
    await db.insert(adminAudit).values({
      action: "parse_error",
      entity: "raw_message",
      entityId: raw.id,
      detail: { error: (err as Error).message },
    });
  }
}

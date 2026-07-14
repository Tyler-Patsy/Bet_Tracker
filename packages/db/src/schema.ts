import {
  bigserial,
  bigint,
  boolean,
  check,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const cappers = pgTable("cappers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  displayName: text("display_name").notNull(),
  slug: text("slug").notNull().unique(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sources = pgTable(
  "sources",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    capperId: bigint("capper_id", { mode: "number" })
      .notNull()
      .references(() => cappers.id),
    kind: text("kind").notNull(),
    handle: text("handle").notNull(),
    externalId: text("external_id"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    unique().on(t.kind, t.handle),
    check("sources_kind_check", sql`${t.kind} IN ('telegram','reddit','x_manual')`),
  ]
);

export const rawMessages = pgTable(
  "raw_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sourceId: bigint("source_id", { mode: "number" })
      .notNull()
      .references(() => sources.id),
    externalId: text("external_id").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
    text: text("text"),
    media: jsonb("media").notNull().default([]),
    editHistory: jsonb("edit_history").notNull().default([]),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
    parseStatus: text("parse_status").notNull().default("pending"),
  },
  (t) => [
    unique().on(t.sourceId, t.externalId),
    check(
      "raw_messages_parse_status_check",
      sql`${t.parseStatus} IN ('pending','parsed','no_picks','error')`
    ),
  ]
);

export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    provider: text("provider").notNull().default("espn"),
    providerId: text("provider_id").notNull(),
    sport: text("sport").notNull(),
    league: text("league").notNull(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    homeAbbrev: text("home_abbrev"),
    awayAbbrev: text("away_abbrev"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("scheduled"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    raw: jsonb("raw"),
  },
  (t) => [
    unique().on(t.provider, t.providerId),
    check(
      "events_status_check",
      sql`${t.status} IN ('scheduled','in_progress','final','postponed','canceled')`
    ),
  ]
);

export const picks = pgTable(
  "picks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    rawMessageId: bigint("raw_message_id", { mode: "number" })
      .notNull()
      .references(() => rawMessages.id),
    capperId: bigint("capper_id", { mode: "number" })
      .notNull()
      .references(() => cappers.id),
    eventId: bigint("event_id", { mode: "number" }).references(() => events.id),
    sport: text("sport").notNull(),
    league: text("league"),
    eventDesc: text("event_desc").notNull(),
    market: text("market").notNull(),
    side: text("side").notNull(),
    line: numeric("line"),
    oddsAmerican: integer("odds_american"),
    units: numeric("units").notNull().default("1.0"),
    stakeConvention: text("stake_convention").notNull().default("risk"),
    mlVariant: text("ml_variant"),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending_review"),
    result: text("result").notNull().default("pending"),
    profitUnits: numeric("profit_units"),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    confidence: numeric("confidence"),
    flags: jsonb("flags").notNull().default([]),
    parserQuote: text("parser_quote"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("picks_capper_graded").on(t.capperId, t.gradedAt),
    index("picks_pending")
      .on(t.result)
      .where(sql`${t.result} = 'pending' AND ${t.status} = 'accepted'`),
    check("picks_market_check", sql`${t.market} IN ('spread','moneyline','total','other')`),
    check(
      "picks_stake_convention_check",
      sql`${t.stakeConvention} IN ('risk','to_win')`
    ),
    check(
      "picks_ml_variant_check",
      sql`${t.mlVariant} IN ('three_way','two_way','draw_no_bet') OR ${t.mlVariant} IS NULL`
    ),
    check(
      "picks_status_check",
      sql`${t.status} IN ('pending_review','accepted','rejected','ungradeable')`
    ),
    check(
      "picks_result_check",
      sql`${t.result} IN ('pending','win','loss','push','void')`
    ),
  ]
);

export const capperStats = pgTable(
  "capper_stats",
  {
    capperId: bigint("capper_id", { mode: "number" })
      .notNull()
      .references(() => cappers.id),
    window: text("window").notNull(),
    sport: text("sport").notNull().default("all"),
    wins: integer("wins"),
    losses: integer("losses"),
    pushes: integer("pushes"),
    unitsRisked: numeric("units_risked"),
    unitsNet: numeric("units_net"),
    roi: numeric("roi"),
    winPct: numeric("win_pct"),
    currentStreak: integer("current_streak"),
    tail100Pnl: numeric("tail_100_pnl"),
    deletedPicks: integer("deleted_picks"),
    gradedPicks: integer("graded_picks"),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.capperId, t.window, t.sport] }),
    check("capper_stats_window_check", sql`${t.window} IN ('7d','30d','season','all')`),
  ]
);

export const adminAudit = pgTable("admin_audit", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: bigint("entity_id", { mode: "number" }),
  detail: jsonb("detail"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

// Seed table for §10.3 fuzzy event matching: maps how a capper might write a
// team name ("Lakers", "LA", "LAL") to the canonical name stored on events.
export const teamAliases = pgTable(
  "team_aliases",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    league: text("league").notNull(),
    canonicalName: text("canonical_name").notNull(),
    alias: text("alias").notNull(),
  },
  (t) => [unique().on(t.league, t.alias)]
);

// Tracks Anthropic token spend per parse call so the worker can enforce the
// §16 cost guardrail (pause the parse queue if projected monthly spend > $25).
export const llmUsage = pgTable("llm_usage", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  costUsd: numeric("cost_usd").notNull(),
  rawMessageId: bigint("raw_message_id", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Single-row table the worker touches every 60s so /api/health can detect a stalled listener (§16).
export const workerHeartbeat = pgTable("worker_heartbeat", {
  id: integer("id").primaryKey().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  link: text("link"),
  why: text("why"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

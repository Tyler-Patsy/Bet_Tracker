CREATE TABLE IF NOT EXISTS "admin_audit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"entity" text,
	"entity_id" bigint,
	"detail" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "capper_stats" (
	"capper_id" bigint NOT NULL,
	"window" text NOT NULL,
	"sport" text DEFAULT 'all' NOT NULL,
	"wins" integer,
	"losses" integer,
	"pushes" integer,
	"units_risked" numeric,
	"units_net" numeric,
	"roi" numeric,
	"win_pct" numeric,
	"current_streak" integer,
	"tail_100_pnl" numeric,
	"deleted_picks" integer,
	"graded_picks" integer,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capper_stats_capper_id_window_sport_pk" PRIMARY KEY("capper_id","window","sport"),
	CONSTRAINT "capper_stats_window_check" CHECK ("capper_stats"."window" IN ('7d','30d','season','all'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cappers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"slug" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cappers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'espn' NOT NULL,
	"provider_id" text NOT NULL,
	"sport" text NOT NULL,
	"league" text NOT NULL,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"home_abbrev" text,
	"away_abbrev" text,
	"start_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"raw" jsonb,
	CONSTRAINT "events_provider_provider_id_unique" UNIQUE("provider","provider_id"),
	CONSTRAINT "events_status_check" CHECK ("events"."status" IN ('scheduled','in_progress','final','postponed','canceled'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "picks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"raw_message_id" bigint NOT NULL,
	"capper_id" bigint NOT NULL,
	"event_id" bigint,
	"sport" text NOT NULL,
	"league" text,
	"event_desc" text NOT NULL,
	"market" text NOT NULL,
	"side" text NOT NULL,
	"line" numeric,
	"odds_american" integer,
	"units" numeric DEFAULT '1.0' NOT NULL,
	"stake_convention" text DEFAULT 'risk' NOT NULL,
	"ml_variant" text,
	"posted_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"result" text DEFAULT 'pending' NOT NULL,
	"profit_units" numeric,
	"graded_at" timestamp with time zone,
	"confidence" numeric,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"parser_quote" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "picks_market_check" CHECK ("picks"."market" IN ('spread','moneyline','total','other')),
	CONSTRAINT "picks_stake_convention_check" CHECK ("picks"."stake_convention" IN ('risk','to_win')),
	CONSTRAINT "picks_ml_variant_check" CHECK ("picks"."ml_variant" IN ('three_way','two_way','draw_no_bet') OR "picks"."ml_variant" IS NULL),
	CONSTRAINT "picks_status_check" CHECK ("picks"."status" IN ('pending_review','accepted','rejected','ungradeable')),
	CONSTRAINT "picks_result_check" CHECK ("picks"."result" IN ('pending','win','loss','push','void'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raw_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_id" bigint NOT NULL,
	"external_id" text NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"text" text,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edit_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"parse_status" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "raw_messages_source_id_external_id_unique" UNIQUE("source_id","external_id"),
	CONSTRAINT "raw_messages_parse_status_check" CHECK ("raw_messages"."parse_status" IN ('pending','parsed','no_picks','error'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"capper_id" bigint NOT NULL,
	"kind" text NOT NULL,
	"handle" text NOT NULL,
	"external_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "sources_kind_handle_unique" UNIQUE("kind","handle"),
	CONSTRAINT "sources_kind_check" CHECK ("sources"."kind" IN ('telegram','reddit','x_manual'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"link" text,
	"why" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "worker_heartbeat" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "capper_stats" ADD CONSTRAINT "capper_stats_capper_id_cappers_id_fk" FOREIGN KEY ("capper_id") REFERENCES "public"."cappers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "picks" ADD CONSTRAINT "picks_raw_message_id_raw_messages_id_fk" FOREIGN KEY ("raw_message_id") REFERENCES "public"."raw_messages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "picks" ADD CONSTRAINT "picks_capper_id_cappers_id_fk" FOREIGN KEY ("capper_id") REFERENCES "public"."cappers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "picks" ADD CONSTRAINT "picks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "raw_messages" ADD CONSTRAINT "raw_messages_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sources" ADD CONSTRAINT "sources_capper_id_cappers_id_fk" FOREIGN KEY ("capper_id") REFERENCES "public"."cappers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "picks_capper_graded" ON "picks" USING btree ("capper_id","graded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "picks_pending" ON "picks" USING btree ("result") WHERE "picks"."result" = 'pending' AND "picks"."status" = 'accepted';
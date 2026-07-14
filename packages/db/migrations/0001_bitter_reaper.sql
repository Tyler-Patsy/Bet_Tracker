CREATE TABLE IF NOT EXISTS "llm_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cost_usd" numeric NOT NULL,
	"raw_message_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_aliases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"league" text NOT NULL,
	"canonical_name" text NOT NULL,
	"alias" text NOT NULL,
	CONSTRAINT "team_aliases_league_alias_unique" UNIQUE("league","alias")
);

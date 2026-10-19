CREATE TABLE IF NOT EXISTS "challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '',
	"flag" text NOT NULL,
	"hints" jsonb DEFAULT '[]'::jsonb,
	"sort_order" integer DEFAULT 0,
	"scoring" text DEFAULT 'static' NOT NULL,
	"initial" integer,
	"minimum" integer,
	"decay" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "solves" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"challenge_id" text NOT NULL,
	"points" integer NOT NULL,
	"solved_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"pass_hash" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "teams_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "solves_team_challenge_uniq" ON "solves" USING btree ("team_id","challenge_id");
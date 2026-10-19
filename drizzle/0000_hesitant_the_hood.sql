CREATE TABLE IF NOT EXISTS "admin_challenges" (
	"admin_id" integer NOT NULL,
	"challenge_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"pass_hash" text NOT NULL,
	"role" text DEFAULT 'scoped' NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"ctf_id" integer NOT NULL,
	"slug" text NOT NULL,
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
CREATE TABLE IF NOT EXISTS "ctfs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text DEFAULT '',
	"frozen_at" bigint,
	"created_at" bigint NOT NULL,
	CONSTRAINT "ctfs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "solves" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"challenge_id" integer NOT NULL,
	"points" integer NOT NULL,
	"solved_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"ctf_id" integer NOT NULL,
	"name" text NOT NULL,
	"pass_hash" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "admin_challenges_uniq" ON "admin_challenges" USING btree ("admin_id","challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "challenges_ctf_slug_uniq" ON "challenges" USING btree ("ctf_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "solves_team_challenge_uniq" ON "solves" USING btree ("team_id","challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "teams_ctf_name_uniq" ON "teams" USING btree ("ctf_id","name");
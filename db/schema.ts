import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const ctfs = pgTable("ctfs", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").default(""),
  frozenAt: bigint("frozen_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passHash: text("pass_hash").notNull(),
  role: text("role").notNull().default("scoped"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const adminChallenges = pgTable(
  "admin_challenges",
  {
    adminId: integer("admin_id").notNull(),
    challengeId: integer("challenge_id").notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("admin_challenges_uniq").on(t.adminId, t.challengeId),
  })
);

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    ctfId: integer("ctf_id").notNull(),
    name: text("name").notNull(),
    passHash: text("pass_hash").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("teams_ctf_name_uniq").on(t.ctfId, t.name),
  })
);

export const challenges = pgTable(
  "challenges",
  {
    id: serial("id").primaryKey(),
    ctfId: integer("ctf_id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    points: integer("points").notNull().default(0),
    description: text("description").default(""),
    flag: text("flag").notNull(),
    hints: jsonb("hints").$type<string[]>().default([]),
    sortOrder: integer("sort_order").default(0),
    scoring: text("scoring").notNull().default("static"),
    initial: integer("initial"),
    minimum: integer("minimum"),
    decay: integer("decay"),
  },
  (t) => ({
    uniq: uniqueIndex("challenges_ctf_slug_uniq").on(t.ctfId, t.slug),
  })
);

export const solves = pgTable(
  "solves",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull(),
    challengeId: integer("challenge_id").notNull(),
    points: integer("points").notNull(),
    solvedAt: bigint("solved_at", { mode: "number" }).notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("solves_team_challenge_uniq").on(t.teamId, t.challengeId),
  })
);

export type Ctf = typeof ctfs.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type Solve = typeof solves.$inferSelect;

import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  passHash: text("pass_hash").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const challenges = pgTable("challenges", {
  id: text("id").primaryKey(),
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
});

export const solves = pgTable(
  "solves",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull(),
    challengeId: text("challenge_id").notNull(),
    points: integer("points").notNull(),
    solvedAt: bigint("solved_at", { mode: "number" }).notNull(),
  },
  (t) => ({
    teamChallenge: uniqueIndex("solves_team_challenge_uniq").on(
      t.teamId,
      t.challengeId
    ),
  })
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

export type Team = typeof teams.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type Solve = typeof solves.$inferSelect;

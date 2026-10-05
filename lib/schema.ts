import { pgTable, serial, text, integer, bigint, timestamp, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  nickname: text("nickname").notNull(),
  lifeSeed: text("life_seed").notNull().unique(),
  cash: bigint("cash", { mode: "number" }).notNull().default(1500),
  lifetimeTaps: bigint("lifetime_taps", { mode: "number" }).notNull().default(0),
  tapPower: integer("tap_power").notNull().default(1),
  tapZone: integer("tap_zone").notNull().default(70),
  energy: integer("energy").notNull().default(100),
  career: text("career").notNull().default("Street Hustler"),
  housing: text("housing").notNull().default("Street"),
  phoneTier: integer("phone_tier").notNull().default(1),
  reputation: integer("reputation").notNull().default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tapBatches = pgTable("tap_batches", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  tapCount: integer("tap_count").notNull(),
  reward: integer("reward").notNull(),
  durationMs: integer("duration_ms").notNull(),
  fingerprint: text("fingerprint"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storyEvents = pgTable("story_events", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  eventKey: text("event_key").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  choice: text("choice"),
  outcome: text("outcome"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("super_admin"),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ emailIdx: uniqueIndex("admin_email_idx").on(table.email) }));

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  encryptedValue: text("encrypted_value"),
  publicValue: text("public_value"),
  updatedBy: integer("updated_by").references(() => adminUsers.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => adminUsers.id),
  action: text("action").notNull(),
  ipHash: text("ip_hash"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

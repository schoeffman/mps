import { pgTable, text, integer, serial, boolean, timestamp, unique } from "drizzle-orm/pg-core";

// ── Better Auth tables ──────────────────────────────────────────────

export const authUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ── App tables ──────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  craftAbility: text("craft_ability").notNull(),
  jobLevel: text("job_level").notNull(),
  craftFocus: text("craft_focus").notNull().default("Not Applicable"),
  authUserId: text("auth_user_id").references(() => authUser.id),
  ownerId: text("owner_id").notNull().references(() => authUser.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  teamLeadId: integer("team_lead_id")
    .notNull()
    .references(() => users.id),
  ownerId: text("owner_id").notNull().references(() => authUser.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetDate: text("target_date").notNull(),
  driId: integer("dri_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("Explore"),
  color: text("color").notNull().default("blue"),
  ownerId: text("owner_id").notNull().references(() => authUser.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
});

export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(),
  ownerId: text("owner_id").notNull().references(() => authUser.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scheduleAssignments = pgTable(
  "schedule_assignments",
  {
    id: serial("id").primaryKey(),
    scheduleId: integer("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    weekStart: text("week_start").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.scheduleId, table.userId, table.weekStart)],
);

export const workHistory = pgTable("work_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  scheduleId: integer("schedule_id").notNull().references(() => schedules.id),
  date: text("date").notNull(),
  ownerId: text("owner_id").notNull().references(() => authUser.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [unique().on(table.userId, table.date, table.scheduleId)]);

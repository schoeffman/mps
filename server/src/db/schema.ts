import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  craftAbility: text("craft_ability").notNull(),
  jobLevel: text("job_level").notNull(),
  craftFocus: text("craft_focus").notNull().default("Not Applicable"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

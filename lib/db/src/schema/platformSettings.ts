import { pgTable, serial, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * Single-row table that stores all platform-level configuration.
 * Row id=1 is always the one row. The API reads and upserts it.
 */
export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  data: jsonb("data").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

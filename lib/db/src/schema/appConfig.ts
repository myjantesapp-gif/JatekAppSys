import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * Key-value store for app-wide configuration that the mobile app
 * reads at startup and that admins can edit from the dashboard.
 *
 * Defaults (when table is empty or key is missing) are handled in the API.
 */
export const appConfigTable = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type AppConfigRow = typeof appConfigTable.$inferSelect;

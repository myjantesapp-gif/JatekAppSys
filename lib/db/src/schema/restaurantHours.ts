import { pgTable, text, serial, timestamp, boolean, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { restaurantsTable } from "./restaurants";

/**
 * Weekly opening hours for a restaurant.
 * dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 * Times are stored as "HH:MM" strings in local restaurant time.
 */
export const restaurantHoursTable = pgTable(
  "restaurant_hours",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id").notNull().references(() => restaurantsTable.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0-6
    openTime: text("open_time").notNull().default("09:00"),
    closeTime: text("close_time").notNull().default("22:00"),
    /** true = restaurant is always closed on this day (day off) */
    isClosed: boolean("is_closed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("idx_restaurant_hours_unique").on(table.restaurantId, table.dayOfWeek),
  ],
);

export type RestaurantHours = typeof restaurantHoursTable.$inferSelect;

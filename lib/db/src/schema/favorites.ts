import { pgTable, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { restaurantsTable } from "./restaurants";

export const favoritesTable = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    restaurantId: integer("restaurant_id").notNull().references(() => restaurantsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("favorites_user_restaurant_uniq").on(t.userId, t.restaurantId),
  }),
);

export type Favorite = typeof favoritesTable.$inferSelect;

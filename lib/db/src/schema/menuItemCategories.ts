import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Product-level categories (e.g. Burger, Pizza, Boisson…).
 * Distinct from `categoriesTable` which classifies restaurants/shops.
 *
 * restaurantId = null  → global category, available to all restaurants
 * restaurantId = N     → private to that restaurant (owner-created)
 */
export const menuItemCategoriesTable = pgTable("menu_item_categories", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id"),          // null = global
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMenuItemCategorySchema = createInsertSchema(menuItemCategoriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMenuItemCategory = z.infer<typeof insertMenuItemCategorySchema>;
export type MenuItemCategory = typeof menuItemCategoriesTable.$inferSelect;

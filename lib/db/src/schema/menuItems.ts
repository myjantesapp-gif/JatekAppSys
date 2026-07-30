import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const menuItemsTable = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  imageUrl: text("image_url"),
  category: text("category").notNull().default("Main"),
  isAvailable: boolean("is_available").notNull().default(true),
  isPopular: boolean("is_popular").notNull().default(false),
  /** Dietary tags: halal | vegetarian | vegan | spicy | gluten_free */
  tags: text("tags").array(),
  /** Free-text allergen list, e.g. "gluten, lactose, noix" */
  allergens: text("allergens"),
  /** Preparation time in minutes */
  prepTimeMinutes: integer("prep_time_minutes"),
  /** Calories (kcal) */
  calories: integer("calories"),
  /** FK to menuItemCategoriesTable — optional structured product category. */
  menuItemCategoryId: integer("menu_item_category_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMenuItemSchema = createInsertSchema(menuItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItemsTable.$inferSelect;

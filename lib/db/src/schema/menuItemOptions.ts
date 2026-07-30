import { pgTable, text, serial, timestamp, boolean, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { menuItemsTable } from "./menuItems";

/**
 * Size variants for a menu item (e.g. Small / Medium / Large sandwich).
 * The final unit price = menuItem.price + priceAdjustment.
 */
export const menuItemSizesTable = pgTable(
  "menu_item_sizes",
  {
    id: serial("id").primaryKey(),
    menuItemId: integer("menu_item_id").notNull().references(() => menuItemsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceAdjustment: real("price_adjustment").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("idx_menu_item_sizes_menu_item_id").on(table.menuItemId)],
);

export const insertMenuItemSizeSchema = createInsertSchema(menuItemSizesTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMenuItemSize = z.infer<typeof insertMenuItemSizeSchema>;
export type MenuItemSize = typeof menuItemSizesTable.$inferSelect;

/**
 * Extra add-ons for a menu item (e.g. extra cheese, sauce, no onions).
 */
export const menuItemExtrasTable = pgTable(
  "menu_item_extras",
  {
    id: serial("id").primaryKey(),
    menuItemId: integer("menu_item_id").notNull().references(() => menuItemsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    price: real("price").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("idx_menu_item_extras_menu_item_id").on(table.menuItemId)],
);

export const insertMenuItemExtraSchema = createInsertSchema(menuItemExtrasTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMenuItemExtra = z.infer<typeof insertMenuItemExtraSchema>;
export type MenuItemExtra = typeof menuItemExtrasTable.$inferSelect;

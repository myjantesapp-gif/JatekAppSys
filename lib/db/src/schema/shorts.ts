import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shortsTable = pgTable("shorts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  restaurantId: integer("restaurant_id"),
  restaurantName: text("restaurant_name"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertShortSchema = createInsertSchema(shortsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShort = z.infer<typeof insertShortSchema>;
export type Short = typeof shortsTable.$inferSelect;

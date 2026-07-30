import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adsTable = pgTable("ads", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("vip_banner"),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  badge: text("badge"),
  bgColor: text("bg_color").notNull().default("#E91E63"),
  accentColor: text("accent_color"),
  icon: text("icon").notNull().default("star"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAdSchema = createInsertSchema(adsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAd = z.infer<typeof insertAdSchema>;
export type Ad = typeof adsTable.$inferSelect;

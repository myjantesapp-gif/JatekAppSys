import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const promoCodesTable = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  /** percentage | fixed | free_delivery */
  type: text("type").notNull().default("percentage"),
  /** Percentage (0-100) for "percentage", MAD amount for "fixed", ignored for "free_delivery" */
  value: real("value").notNull().default(0),
  minOrderAmount: real("min_order_amount").notNull().default(0),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  maxUsesPerUser: integer("max_uses_per_user").notNull().default(1),
  firstOrderOnly: boolean("first_order_only").notNull().default(false),
  /** null = platform-wide, set = only for that restaurant */
  restaurantId: integer("restaurant_id"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodesTable).omit({ id: true, usedCount: true, createdAt: true });
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodesTable.$inferSelect;

export const promoCodeUsagesTable = pgTable("promo_code_usages", {
  id: serial("id").primaryKey(),
  promoCodeId: integer("promo_code_id").notNull(),
  userId: integer("user_id").notNull(),
  orderId: integer("order_id").notNull(),
  discountAmount: real("discount_amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type PromoCodeUsage = typeof promoCodeUsagesTable.$inferSelect;

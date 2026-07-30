import { pgTable, text, serial, timestamp, boolean, integer, real, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const restaurantsTable = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  phone: text("phone"),
  imageUrl: text("image_url"),
  coverImageUrl: text("cover_image_url"),
  logoUrl: text("logo_url"),
  category: text("category").notNull().default("Other"),
  businessType: text("business_type").notNull().default("restaurant"),
  isLocal: boolean("is_local").notNull().default(false),
  isOpen: boolean("is_open").notNull().default(true),
  deliveryTime: integer("delivery_time"),
  deliveryFee: real("delivery_fee"),
  minimumOrder: real("minimum_order"),
  rating: real("rating"),
  reviewCount: integer("review_count").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  /** Number of times the restaurant's VIP/Promo banner has been clicked from the mobile app. */
  clickCount: integer("click_count").notNull().default(0),
  /** Legal/registered business name (may differ from display name). */
  legalName: text("legal_name"),
  /** Moroccan Identifiant Commun de l'Entreprise (15 digits). */
  ice: text("ice"),
  /** Optional email address for the kitchen printer (email-to-print services). */
  printerEmail: text("printer_email"),
  /** Set when the owner has filled in the mandatory business details. */
  profileCompletedAt: timestamp("profile_completed_at", { withTimezone: true }),
  /** GPS coordinates (WGS-84) for delivery ETA calculation and map display. */
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  /** Whether this restaurant is pinned in the "featured" home carousel. */
  isFeatured: boolean("is_featured").notNull().default(false),
  /** FK to categoriesTable — the subcategory (parentId != null) this shop belongs to. */
  subcategoryId: integer("subcategory_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRestaurantSchema = createInsertSchema(restaurantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurantsTable.$inferSelect;

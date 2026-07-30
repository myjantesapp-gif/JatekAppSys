import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const driversTable = pgTable("drivers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  vehicleType: text("vehicle_type"),
  /** Vehicle plate / matricule — required to accept deliveries. */
  vehiclePlate: text("vehicle_plate"),
  /** National ID number (CIN) — required to accept deliveries. */
  nationalId: text("national_id"),
  /** Driver license number (optional but encouraged for car/scooter). */
  licenseNumber: text("license_number"),
  /** Profile photo URL (optional). */
  photoUrl: text("photo_url"),
  /** Set the moment the driver completes the mandatory onboarding fields. */
  profileCompletedAt: timestamp("profile_completed_at", { withTimezone: true }),
  isAvailable: boolean("is_available").notNull().default(true),
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  rating: real("rating"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  locationUpdatedAt: timestamp("location_updated_at", { withTimezone: true }),
  /** Expo push token — used to send remote notifications when the app is closed. */
  pushToken: text("push_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof driversTable.$inferSelect;

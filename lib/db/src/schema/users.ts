import { pgTable, text, serial, timestamp, boolean, integer, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Custom-permissions payload stored when role === 'other'.
 *  - inheritedRoles: list of base roles the user inherits permissions from
 *  - grants: extra granular permission keys (e.g. "shops.write", "wallets.*")
 */
export type CustomPermissions = {
  inheritedRoles?: string[];
  grants?: string[];
};

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  /** customer | driver | restaurant_owner | employee | manager | admin | super_admin | other */
  role: text("role").notNull().default("customer"),
  phone: text("phone"),
  address: text("address"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  /** Platform wallet balance in MAD (credited via referrals, refunds, promotions). */
  walletBalance: real("wallet_balance").notNull().default(0),
  /** Unique referral code this user can share to earn credits. */
  referralCode: text("referral_code").unique(),
  /** The user who referred this user (userId of referrer). */
  referredBy: integer("referred_by"),
  /** Set when role=employee — the shop they are assigned to. */
  assignedShopId: integer("assigned_shop_id"),
  /** Custom permissions, used when role === 'other'. Set by super_admin. */
  permissions: jsonb("permissions").$type<CustomPermissions>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

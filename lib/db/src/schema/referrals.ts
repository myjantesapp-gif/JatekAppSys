import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredId: integer("referred_id"),
  code: text("code").notNull().unique(),
  /** pending | completed | expired */
  status: text("status").notNull().default("pending"),
  /** MAD credited to the referrer when the referred user places their first order */
  creditAmount: real("credit_amount").notNull().default(20),
  /** MAD credited to the newly registered user */
  referredCreditAmount: real("referred_credit_amount").notNull().default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertReferralSchema = createInsertSchema(referralsTable).omit({ id: true, referredId: true, status: true, createdAt: true, completedAt: true });
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referralsTable.$inferSelect;

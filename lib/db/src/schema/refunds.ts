import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";

export const refundsTable = pgTable("refunds", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  userId: integer("user_id").notNull(),
  /** Amount refunded in MAD */
  amount: real("amount").notNull(),
  reason: text("reason").notNull(),
  /** wallet_credit | cash | gesture */
  type: text("type").notNull().default("wallet_credit"),
  adminId: integer("admin_id").notNull(),
  adminName: text("admin_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Refund = typeof refundsTable.$inferSelect;

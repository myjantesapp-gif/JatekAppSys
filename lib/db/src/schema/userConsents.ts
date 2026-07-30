import { pgTable, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userConsentsTable = pgTable("user_consents", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  // Cookies / tracking
  cookiesEssential: boolean("cookies_essential").notNull().default(true),
  cookiesAnalytics: boolean("cookies_analytics").notNull().default(false),
  cookiesMarketing: boolean("cookies_marketing").notNull().default(false),
  // Personal data processing
  dataProcessing: boolean("data_processing").notNull().default(true),
  dataSharing: boolean("data_sharing").notNull().default(false),
  personalization: boolean("personalization").notNull().default(false),
  // Marketing channels
  marketingEmails: boolean("marketing_emails").notNull().default(false),
  marketingSms: boolean("marketing_sms").notNull().default(false),
  marketingPush: boolean("marketing_push").notNull().default(false),
  // Legal acceptance
  termsVersion: text("terms_version"),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  privacyVersion: text("privacy_version"),
  privacyAcceptedAt: timestamp("privacy_accepted_at", { withTimezone: true }),
  cookiesVersion: text("cookies_version"),
  cookiesAcceptedAt: timestamp("cookies_accepted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserConsents = typeof userConsentsTable.$inferSelect;

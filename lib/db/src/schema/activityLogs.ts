import { pgTable, text, serial, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";

export const activityLogsTable = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    userEmail: text("user_email"),
    userName: text("user_name"),
    /** create | update | delete | login | logout | export | import | refund | cancel | gesture | reset_password | assign_shop | wallet_credit */
    action: text("action").notNull(),
    /** order | user | shop | product | category | ad | promo_code | staff | driver | system */
    entity: text("entity"),
    entityId: integer("entity_id"),
    details: jsonb("details"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_activity_logs_user_id").on(table.userId),
    index("idx_activity_logs_action").on(table.action),
    index("idx_activity_logs_created_at").on(table.createdAt),
  ],
);

export type ActivityLog = typeof activityLogsTable.$inferSelect;

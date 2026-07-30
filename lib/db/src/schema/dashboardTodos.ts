import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const dashboardTodosTable = pgTable("dashboard_todos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  text: text("text").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DashboardTodo = typeof dashboardTodosTable.$inferSelect;

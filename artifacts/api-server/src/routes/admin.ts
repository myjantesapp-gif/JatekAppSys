import { Router, type IRouter } from "express";
import { db, usersTable, restaurantsTable, ordersTable, driversTable } from "@workspace/db";
import { eq, inArray, count, sum, gte, desc } from "drizzle-orm";
import { orderItemsTable } from "@workspace/db";
import { requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/admin/stats", requireRole("admin"), async (_req, res): Promise<void> => {
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [restaurantCount] = await db.select({ count: count() }).from(restaurantsTable);
  const [orderCount] = await db.select({ count: count() }).from(ordersTable);
  const [driverCount] = await db.select({ count: count() }).from(driversTable);
  const [revenueResult] = await db.select({ total: sum(ordersTable.total) }).from(ordersTable).where(eq(ordersTable.status, "delivered"));

  const activeStatuses = ["pending", "accepted", "preparing", "ready", "picked_up"];
  const [activeOrderCount] = await db.select({ count: count() }).from(ordersTable).where(inArray(ordersTable.status, activeStatuses));

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [todayOrders] = await db.select({ count: count() }).from(ordersTable).where(gte(ordersTable.createdAt, startOfDay));
  const [todayUsers] = await db.select({ count: count() }).from(usersTable).where(gte(usersTable.createdAt, startOfDay));

  res.json({
    totalUsers: Number(userCount?.count || 0),
    totalRestaurants: Number(restaurantCount?.count || 0),
    totalOrders: Number(orderCount?.count || 0),
    totalDrivers: Number(driverCount?.count || 0),
    activeOrders: Number(activeOrderCount?.count || 0),
    revenue: Number(revenueResult?.total || 0),
    ordersToday: Number(todayOrders?.count || 0),
    newUsersToday: Number(todayUsers?.count || 0),
  });
});

router.get("/admin/recent-orders", requireRole("admin"), async (_req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(20);

  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      return { ...order, items };
    })
  );

  res.json(ordersWithItems);
});

export default router;

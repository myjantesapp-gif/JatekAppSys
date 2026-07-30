import { Router, type IRouter } from "express";
import { db, usersTable, ordersTable } from "@workspace/db";
import { eq, count, sum } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function getTier(points: number): string {
  if (points >= 500) return "Gold";
  if (points >= 100) return "Silver";
  return "Bronze";
}

function getNextTierPoints(points: number): number {
  if (points >= 500) return 0;
  if (points >= 100) return 500 - points;
  return 100 - points;
}

router.get("/rewards/my", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [orderStats] = await db
    .select({ totalOrders: count(), totalSpent: sum(ordersTable.total) })
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId));

  const loyaltyPoints = user.loyaltyPoints;

  res.json({
    userId,
    loyaltyPoints,
    tier: getTier(loyaltyPoints),
    nextTierPoints: getNextTierPoints(loyaltyPoints),
    totalOrdersCount: Number(orderStats?.totalOrders || 0),
    totalSpent: Number(orderStats?.totalSpent || 0),
  });
});

export default router;

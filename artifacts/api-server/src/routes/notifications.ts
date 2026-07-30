import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, isNull, desc, lt } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

/** List my notifications (newest first, max 50) */
router.get("/notifications", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.userId!))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  const unreadCount = notifications.filter((n) => !n.readAt).length;
  res.json({ notifications, unreadCount });
});

/** Mark all my notifications as read — must be registered BEFORE /:id/read
 *  so Express doesn't swallow "read-all" as a numeric id parameter. */
router.patch("/notifications/read-all", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsTable.userId, req.userId!), isNull(notificationsTable.readAt)));

  res.json({ success: true });
});

/** Mark a notification as read */
router.patch("/notifications/:id/read", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [notif] = await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId!)))
    .returning();

  if (!notif) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(notif);
});

/** Delete a notification */
router.delete("/notifications/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId!)));
  res.json({ success: true });
});

export default router;

/** Helper used by other routes to push a notification to a user */
export async function pushNotification(
  userId: number,
  type: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, body, data: data ?? null });
  } catch (e) {
    console.error("[notifications] push failed", e);
  }
}

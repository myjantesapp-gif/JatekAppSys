import { Router, type IRouter } from "express";
import { db, chatMessagesTable, ordersTable, driversTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";
import { publish } from "../lib/sse";

const router: IRouter = Router();

/** Send a message in the order chat */
router.post("/orders/:id/chat", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const orderId = parseInt(String(req.params.id), 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const { message } = req.body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message requis" });
    return;
  }
  if (message.length > 500) {
    res.status(400).json({ error: "Message trop long (500 caractères max)" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  // Only customer or assigned driver may chat on this order
  const isCustomer = order.userId === req.userId;
  let isDriver = false;
  if (order.driverId) {
    const [drv] = await db.select().from(driversTable).where(eq(driversTable.id, order.driverId)).limit(1);
    isDriver = drv?.userId === req.userId;
  }
  const isAdmin = req.userRole === "admin" || req.userRole === "super_admin";

  if (!isCustomer && !isDriver && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const senderRole = isAdmin ? "admin" : isDriver ? "driver" : "customer";
  const senderName = req.userRole === "driver"
    ? (await db.select({ name: driversTable.name }).from(driversTable).where(eq(driversTable.userId, req.userId!)).limit(1))[0]?.name ?? "Livreur"
    : "Client";

  const [msg] = await db.insert(chatMessagesTable).values({
    orderId,
    senderId: req.userId!,
    senderRole,
    senderName,
    message: message.trim(),
  }).returning();

  // Fan out via SSE so both parties see the message instantly
  publish(`order:${orderId}`, "chat_message", msg);
  publish(`driver_orders:${order.driverId}`, "chat_message", msg);

  res.status(201).json(msg);
});

/** Get all messages for an order */
router.get("/orders/:id/chat", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const orderId = parseInt(String(req.params.id), 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const isCustomer = order.userId === req.userId;
  let isDriver = false;
  if (order.driverId) {
    const [drv] = await db.select().from(driversTable).where(eq(driversTable.id, order.driverId)).limit(1);
    isDriver = drv?.userId === req.userId;
  }
  const isAdmin = req.userRole === "admin" || req.userRole === "super_admin";

  if (!isCustomer && !isDriver && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.orderId, orderId));

  // Mark unread messages as read for this user
  const unreadIds = messages
    .filter((m) => m.senderId !== req.userId && !m.readAt)
    .map((m) => m.id);
  if (unreadIds.length > 0) {
    const now = new Date();
    for (const id of unreadIds) {
      await db.update(chatMessagesTable).set({ readAt: now }).where(eq(chatMessagesTable.id, id));
    }
  }

  res.json(messages);
});

export default router;

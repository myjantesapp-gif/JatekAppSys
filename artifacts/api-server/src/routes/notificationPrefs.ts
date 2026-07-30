import { Router, type IRouter } from "express";
import { db, notificationPrefsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";
import { vapidPublicKey } from "../lib/vapid";

const router: IRouter = Router();

const DEFAULTS = {
  pushOrders: true,
  pushPromos: true,
  emailReceipts: true,
  emailNewsletter: false,
  smsAlerts: false,
  language: "fr" as const,
  pushToken: null as string | null,
  webPushSub: null as string | null,
};

router.get("/notification-prefs", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const [row] = await db
    .select()
    .from(notificationPrefsTable)
    .where(eq(notificationPrefsTable.userId, userId))
    .limit(1);
  if (!row) {
    const [created] = await db
      .insert(notificationPrefsTable)
      .values({ userId, ...DEFAULTS })
      .returning();
    res.json(created);
    return;
  }
  res.json(row);
});

router.get("/notification-prefs/vapid-key", requireAuth, (_req, res): void => {
  res.json({ publicKey: vapidPublicKey });
});

router.patch("/notification-prefs", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const patch = req.body ?? {};
  const allowed = ["pushOrders", "pushPromos", "emailReceipts", "emailNewsletter", "smsAlerts", "language", "pushToken", "webPushSub"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in patch) data[k] = patch[k];

  const [existing] = await db
    .select()
    .from(notificationPrefsTable)
    .where(eq(notificationPrefsTable.userId, userId))
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(notificationPrefsTable)
      .values({ userId, ...DEFAULTS, ...data })
      .returning();
    res.json(created);
    return;
  }

  const [updated] = await db
    .update(notificationPrefsTable)
    .set(data)
    .where(eq(notificationPrefsTable.userId, userId))
    .returning();
  res.json(updated);
});

export default router;

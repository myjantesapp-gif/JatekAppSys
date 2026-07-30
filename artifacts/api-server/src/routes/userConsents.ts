import { Router, type IRouter } from "express";
import {
  db,
  userConsentsTable,
  usersTable,
  ordersTable,
  orderItemsTable,
  addressesTable,
  paymentMethodsTable,
  favoritesTable,
  notificationPrefsTable,
  reviewsTable,
  supportTicketsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

const TERMS_VERSION = "2026-04";
const PRIVACY_VERSION = "2026-04";
const COOKIES_VERSION = "2026-04";

const ALLOWED_FIELDS = [
  "cookiesAnalytics",
  "cookiesMarketing",
  "dataProcessing",
  "dataSharing",
  "personalization",
  "marketingEmails",
  "marketingSms",
  "marketingPush",
] as const;

async function ensureRow(userId: number) {
  const [existing] = await db
    .select()
    .from(userConsentsTable)
    .where(eq(userConsentsTable.userId, userId))
    .limit(1);
  if (existing) return existing;
  const [row] = await db.insert(userConsentsTable).values({ userId }).returning();
  return row;
}

router.get("/consents", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const row = await ensureRow(req.userId!);
  res.json({ ...row, currentVersions: { terms: TERMS_VERSION, privacy: PRIVACY_VERSION, cookies: COOKIES_VERSION } });
});

router.patch("/consents", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  await ensureRow(req.userId!);
  const body = req.body ?? {};
  const update: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (typeof body[field] === "boolean") update[field] = body[field];
  }
  const now = new Date();
  if (body.acceptTerms === true) {
    update.termsVersion = TERMS_VERSION;
    update.termsAcceptedAt = now;
  }
  if (body.acceptPrivacy === true) {
    update.privacyVersion = PRIVACY_VERSION;
    update.privacyAcceptedAt = now;
  }
  if (body.acceptCookies === true) {
    update.cookiesVersion = COOKIES_VERSION;
    update.cookiesAcceptedAt = now;
  }
  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }
  const [row] = await db
    .update(userConsentsTable)
    .set(update)
    .where(eq(userConsentsTable.userId, req.userId!))
    .returning();
  res.json(row);
});

router.post("/consents/accept-all", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  await ensureRow(req.userId!);
  const now = new Date();
  const [row] = await db
    .update(userConsentsTable)
    .set({
      cookiesAnalytics: true,
      cookiesMarketing: true,
      dataProcessing: true,
      dataSharing: true,
      personalization: true,
      marketingEmails: true,
      marketingSms: true,
      marketingPush: true,
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: now,
      privacyVersion: PRIVACY_VERSION,
      privacyAcceptedAt: now,
      cookiesVersion: COOKIES_VERSION,
      cookiesAcceptedAt: now,
    })
    .where(eq(userConsentsTable.userId, req.userId!))
    .returning();
  res.json(row);
});

router.post("/consents/reject-all", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  await ensureRow(req.userId!);
  const now = new Date();
  const [row] = await db
    .update(userConsentsTable)
    .set({
      cookiesAnalytics: false,
      cookiesMarketing: false,
      dataSharing: false,
      personalization: false,
      marketingEmails: false,
      marketingSms: false,
      marketingPush: false,
      cookiesVersion: COOKIES_VERSION,
      cookiesAcceptedAt: now,
    })
    .where(eq(userConsentsTable.userId, req.userId!))
    .returning();
  res.json(row);
});

/** RGPD: data portability — full personal data dump as JSON. */
router.get("/me/export", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { passwordHash: _ph, ...safeUser } = user as any;
  const [orders, addresses, payments, favorites, notifPrefs, consents, reviews, tickets] = await Promise.all([
    db.select().from(ordersTable).where(eq(ordersTable.userId, userId)),
    db.select().from(addressesTable).where(eq(addressesTable.userId, userId)),
    db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.userId, userId)),
    db.select().from(favoritesTable).where(eq(favoritesTable.userId, userId)),
    db.select().from(notificationPrefsTable).where(eq(notificationPrefsTable.userId, userId)),
    db.select().from(userConsentsTable).where(eq(userConsentsTable.userId, userId)),
    db.select().from(reviewsTable).where(eq(reviewsTable.userId, userId)),
    db.select().from(supportTicketsTable).where(eq(supportTicketsTable.userId, userId)),
  ]);
  const orderIds = orders.map((o) => o.id);
  const orderItems = orderIds.length
    ? await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds))
    : [];
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="jatek-export-${userId}-${Date.now()}.json"`);
  res.json({
    generatedAt: new Date().toISOString(),
    user: safeUser,
    orders,
    orderItems,
    addresses,
    paymentMethods: payments.map((p) => ({ ...p, last4: p.last4 })),
    favorites,
    notificationPrefs: notifPrefs[0] ?? null,
    consents: consents[0] ?? null,
    reviews,
    supportTickets: tickets,
  });
});

/** RGPD: right to erasure. Deletes user and all related rows via ON DELETE CASCADE. */
router.delete("/me", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const userId = req.userId!;
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.sendStatus(204);
});

export default router;

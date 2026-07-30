/**
 * backendAdmin.ts — Extended admin endpoints
 *
 * Ads/Banners CRUD, Restaurant Hours (+ auto-close), Order Actions (refund/cancel/gesture),
 * User Admin Actions (reset-password, assign-shop, wallet-credit), Activity Audit Log,
 * Data Export (CSV/JSON), Data Import (JSON), System Monitoring, DB Backup.
 */
import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import {
  db,
  usersTable,
  restaurantsTable,
  ordersTable,
  menuItemsTable,
  adsTable,
  promoCodesTable,
  driversTable,
  activityLogsTable,
  restaurantHoursTable,
  refundsTable,
  appConfigTable,
} from "@workspace/db";
import { eq, and, desc, sql, count, inArray } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();
const execAsync = promisify(exec);

// ─── helpers ────────────────────────────────────────────────────────────────

function isAdmin(role?: string): boolean {
  return !!role && ["super_admin", "admin", "manager"].includes(role);
}
function isSuperAdmin(role?: string): boolean {
  return !!role && ["super_admin", "admin"].includes(role);
}

async function logActivity(params: {
  userId?: number;
  userEmail?: string;
  userName?: string;
  action: string;
  entity?: string;
  entityId?: number;
  details?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await db.insert(activityLogsTable).values({
      userId: params.userId ?? null,
      userEmail: params.userEmail ?? null,
      userName: params.userName ?? null,
      action: params.action,
      entity: params.entity ?? null,
      entityId: params.entityId ?? null,
      details: (params.details ?? null) as any,
      ip: params.ip ?? null,
    });
  } catch (e) {
    console.error("[audit] logActivity failed", e);
  }
}

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

function toCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return "";
        const s = typeof v === "object" ? JSON.stringify(v) : String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      })
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

// ────────────────────────────────────────────────────────────────────────────
// ADS / BANNERS CRUD
// ────────────────────────────────────────────────────────────────────────────

router.get("/backend/ads", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const ads = await db.select().from(adsTable).orderBy(adsTable.sortOrder);
    res.json(ads);
  } catch (err) { next(err); }
});

router.post("/backend/ads", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const { type, title, subtitle, badge, bgColor, accentColor, icon, imageUrl, linkUrl, isActive, sortOrder } = req.body;
    if (!title) { res.status(400).json({ error: "title requis" }); return; }
    const [ad] = await db.insert(adsTable).values({
      type: type ?? "vip_banner",
      title,
      subtitle: subtitle ?? null,
      badge: badge ?? null,
      bgColor: bgColor ?? "#E91E63",
      accentColor: accentColor ?? null,
      icon: icon ?? "star",
      imageUrl: imageUrl ?? null,
      linkUrl: linkUrl ?? null,
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
    }).returning();
    const [u] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await logActivity({ userId: req.userId, userEmail: u?.email, userName: u?.name, action: "create", entity: "ad", entityId: ad.id, ip: req.ip });
    res.status(201).json(ad);
  } catch (err) { next(err); }
});

router.patch("/backend/ads/:id", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const allowed = ["type", "title", "subtitle", "badge", "bgColor", "accentColor", "icon", "imageUrl", "linkUrl", "isActive", "sortOrder"];
    const updates: Record<string, unknown> = {};
    const body = req.body ?? {};
    for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
    const [ad] = await db.update(adsTable).set(updates as any).where(eq(adsTable.id, id)).returning();
    if (!ad) { res.status(404).json({ error: "Not found" }); return; }
    const [u] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await logActivity({ userId: req.userId, userEmail: u?.email, userName: u?.name, action: "update", entity: "ad", entityId: id, ip: req.ip });
    res.json(ad);
  } catch (err) { next(err); }
});

router.delete("/backend/ads/:id", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isSuperAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(adsTable).where(eq(adsTable.id, id));
    const [u] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await logActivity({ userId: req.userId, userEmail: u?.email, userName: u?.name, action: "delete", entity: "ad", entityId: id, ip: req.ip });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// RESTAURANT HOURS
// ────────────────────────────────────────────────────────────────────────────

router.get("/backend/shops/:id/hours", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole) && req.userRole !== "restaurant_owner") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const shopId = parseInt(String(req.params.id), 10);
    if (isNaN(shopId)) { res.status(400).json({ error: "Invalid id" }); return; }
    // restaurant_owner: verify they own this shop
    if (req.userRole === "restaurant_owner") {
      const owned = await db.select({ id: restaurantsTable.id }).from(restaurantsTable)
        .where(and(eq(restaurantsTable.id, shopId), eq(restaurantsTable.ownerId, req.userId!)));
      if (owned.length === 0) { res.status(403).json({ error: "Forbidden: not your restaurant" }); return; }
    }
    const hours = await db.select().from(restaurantHoursTable)
      .where(eq(restaurantHoursTable.restaurantId, shopId))
      .orderBy(restaurantHoursTable.dayOfWeek);
    res.json(hours);
  } catch (err) { next(err); }
});

/** Upsert full weekly schedule — body: { hours: [{dayOfWeek,openTime,closeTime,isClosed}] } */
router.put("/backend/shops/:id/hours", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole) && req.userRole !== "restaurant_owner") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const shopId = parseInt(String(req.params.id), 10);
    // restaurant_owner: verify they own this shop
    if (req.userRole === "restaurant_owner") {
      const owned = await db.select({ id: restaurantsTable.id }).from(restaurantsTable)
        .where(and(eq(restaurantsTable.id, shopId), eq(restaurantsTable.ownerId, req.userId!)));
      if (owned.length === 0) { res.status(403).json({ error: "Forbidden: not your restaurant" }); return; }
    }
    if (isNaN(shopId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { hours } = req.body ?? {};
    if (!Array.isArray(hours)) { res.status(400).json({ error: "hours[] requis" }); return; }

    await db.transaction(async (tx) => {
      for (const h of hours) {
        const day = Number(h.dayOfWeek);
        if (isNaN(day) || day < 0 || day > 6) continue;
        const existing = await tx.select({ id: restaurantHoursTable.id })
          .from(restaurantHoursTable)
          .where(and(eq(restaurantHoursTable.restaurantId, shopId), eq(restaurantHoursTable.dayOfWeek, day)))
          .limit(1);
        if (existing.length > 0) {
          await tx.update(restaurantHoursTable).set({
            openTime: h.openTime ?? "09:00",
            closeTime: h.closeTime ?? "22:00",
            isClosed: h.isClosed ?? false,
          }).where(eq(restaurantHoursTable.id, existing[0].id));
        } else {
          await tx.insert(restaurantHoursTable).values({
            restaurantId: shopId, dayOfWeek: day,
            openTime: h.openTime ?? "09:00",
            closeTime: h.closeTime ?? "22:00",
            isClosed: h.isClosed ?? false,
          });
        }
      }
    });

    const result = await db.select().from(restaurantHoursTable)
      .where(eq(restaurantHoursTable.restaurantId, shopId))
      .orderBy(restaurantHoursTable.dayOfWeek);
    res.json(result);
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// ORDER ACTIONS
// ────────────────────────────────────────────────────────────────────────────

/** POST /backend/orders/:id/refund — credit user wallet */
router.post("/backend/orders/:id/refund", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const orderId = parseInt(String(req.params.id), 10);
    if (isNaN(orderId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { amount, reason, notes } = req.body;
    if (!amount || !reason) { res.status(400).json({ error: "amount et reason requis" }); return; }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) { res.status(404).json({ error: "Commande introuvable" }); return; }

    const refundAmount = Math.min(Number(amount), order.total);

    await db.update(usersTable).set({
      walletBalance: sql`${usersTable.walletBalance} + ${refundAmount}`,
    }).where(eq(usersTable.id, order.userId));

    const [adminUser] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

    await db.insert(refundsTable).values({
      orderId, userId: order.userId,
      amount: refundAmount, reason,
      type: "wallet_credit",
      adminId: req.userId!,
      adminName: adminUser?.name ?? null,
      notes: notes ?? null,
    });

    await logActivity({ userId: req.userId, userEmail: adminUser?.email, userName: adminUser?.name, action: "refund", entity: "order", entityId: orderId, details: { amount: refundAmount, reason }, ip: req.ip });

    res.json({ success: true, refundedAmount: refundAmount, message: `${refundAmount} DH crédité sur le wallet du client` });
  } catch (err) { next(err); }
});

/** POST /backend/orders/:id/gesture — commercial gesture (wallet credit, no refund record) */
router.post("/backend/orders/:id/gesture", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const orderId = parseInt(String(req.params.id), 10);
    if (isNaN(orderId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { amount, reason } = req.body;
    if (!amount || !reason) { res.status(400).json({ error: "amount et reason requis" }); return; }

    const [order] = await db.select({ userId: ordersTable.userId }).from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) { res.status(404).json({ error: "Commande introuvable" }); return; }

    await db.update(usersTable).set({
      walletBalance: sql`${usersTable.walletBalance} + ${Number(amount)}`,
    }).where(eq(usersTable.id, order.userId));

    const [adminUser] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await logActivity({ userId: req.userId, userEmail: adminUser?.email, userName: adminUser?.name, action: "gesture", entity: "order", entityId: orderId, details: { amount: Number(amount), reason }, ip: req.ip });

    res.json({ success: true, creditedAmount: Number(amount), message: `Geste commercial: ${amount} DH crédité` });
  } catch (err) { next(err); }
});

/** PATCH /backend/orders/:id/cancel — cancel + optional wallet refund */
router.patch("/backend/orders/:id/cancel", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const orderId = parseInt(String(req.params.id), 10);
    if (isNaN(orderId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { reason, refundToWallet } = req.body;

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) { res.status(404).json({ error: "Commande introuvable" }); return; }
    if (["delivered", "cancelled"].includes(order.status)) {
      res.status(400).json({ error: "Cette commande ne peut plus être annulée" }); return;
    }

    await db.update(ordersTable).set({ status: "cancelled" }).where(eq(ordersTable.id, orderId));

    if (refundToWallet) {
      await db.update(usersTable).set({
        walletBalance: sql`${usersTable.walletBalance} + ${order.total}`,
      }).where(eq(usersTable.id, order.userId));
    }

    const [adminUser] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await logActivity({ userId: req.userId, userEmail: adminUser?.email, userName: adminUser?.name, action: "cancel", entity: "order", entityId: orderId, details: { reason, refundToWallet, total: order.total }, ip: req.ip });

    res.json({ success: true, refunded: !!refundToWallet, message: refundToWallet ? `Commande annulée et ${order.total} DH remboursé` : "Commande annulée" });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// USER ADMIN ACTIONS
// ────────────────────────────────────────────────────────────────────────────

/** Admin reset a user's password */
router.patch("/backend/users/:id/reset-password", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isSuperAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden: super_admin requis" }); return; }
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 8) {
      res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères" }); return;
    }
    const hashed = await bcrypt.hash(String(newPassword), 12);
    const [user] = await db.update(usersTable).set({ password: hashed })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email });
    if (!user) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }

    const [adminUser] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await logActivity({ userId: req.userId, userEmail: adminUser?.email, userName: adminUser?.name, action: "reset_password", entity: "user", entityId: userId, ip: req.ip });

    res.json({ success: true, message: `Mot de passe réinitialisé pour ${user.name}` });
  } catch (err) { next(err); }
});

/** Assign a user as owner of a restaurant */
router.patch("/backend/users/:id/assign-restaurant", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isSuperAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden: super_admin requis" }); return; }
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { restaurantId } = req.body; // null = unassign

    if (restaurantId) {
      await db.update(restaurantsTable).set({ ownerId: userId }).where(eq(restaurantsTable.id, Number(restaurantId)));
      await db.update(usersTable).set({ role: "restaurant_owner" }).where(eq(usersTable.id, userId));
    }
    await db.update(usersTable).set({ assignedShopId: restaurantId ? Number(restaurantId) : null }).where(eq(usersTable.id, userId));

    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const [adminUser] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await logActivity({ userId: req.userId, userEmail: adminUser?.email, userName: adminUser?.name, action: "assign_shop", entity: "user", entityId: userId, details: { restaurantId }, ip: req.ip });

    res.json({ success: true, message: restaurantId ? `${user?.name} assigné au restaurant #${restaurantId}` : `${user?.name} désassigné` });
  } catch (err) { next(err); }
});

/** Credit or debit a user's wallet */
router.patch("/backend/users/:id/wallet-credit", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { amount, reason } = req.body;
    if (amount === undefined) { res.status(400).json({ error: "amount requis" }); return; }

    const [user] = await db.update(usersTable).set({
      walletBalance: sql`${usersTable.walletBalance} + ${Number(amount)}`,
    }).where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id, name: usersTable.name, walletBalance: usersTable.walletBalance });
    if (!user) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }

    const [adminUser] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await logActivity({ userId: req.userId, userEmail: adminUser?.email, userName: adminUser?.name, action: "wallet_credit", entity: "user", entityId: userId, details: { amount: Number(amount), reason }, ip: req.ip });

    res.json({ success: true, newBalance: user.walletBalance, message: `${amount} DH crédité sur le wallet de ${user.name}` });
  } catch (err) { next(err); }
});

const ASSIGNABLE_ROLES = ["super_admin", "admin", "manager", "restaurant_owner", "employee", "customer", "driver", "other"] as const;
type AssignableRole = typeof ASSIGNABLE_ROLES[number];

/** Update any user's role (super_admin only) */
router.patch("/backend/users/:id/role", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isSuperAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden: super_admin requis" }); return; }
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { role } = req.body ?? {};
    if (!role) { res.status(400).json({ error: "role requis" }); return; }
    if (!(ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
      res.status(400).json({ error: `Rôle invalide. Valeurs acceptées: ${ASSIGNABLE_ROLES.join(", ")}` }); return;
    }
    const [user] = await db.update(usersTable).set({ role: role as AssignableRole }).where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id, name: usersTable.name, role: usersTable.role });
    if (!user) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }
    res.json(user);
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// FULL USER CRUD (for admin panel)
// ────────────────────────────────────────────────────────────────────────────

router.get("/backend/users", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const { search, role } = req.query;
    let query = db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, phone: usersTable.phone, isActive: usersTable.isActive,
      walletBalance: usersTable.walletBalance, loyaltyPoints: usersTable.loyaltyPoints,
      assignedShopId: usersTable.assignedShopId, createdAt: usersTable.createdAt,
    }).from(usersTable).$dynamic();

    const conditions = [];
    if (role) conditions.push(eq(usersTable.role, String(role)));
    if (search) conditions.push(sql`(${usersTable.name} ILIKE ${'%' + search + '%'} OR ${usersTable.email} ILIKE ${'%' + search + '%'})`);
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;

    const users = await query.orderBy(desc(usersTable.createdAt)).limit(500);
    res.json(users);
  } catch (err) { next(err); }
});

router.post("/backend/users", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isSuperAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const { name, email, password, role, phone, isActive } = req.body;
    if (!name || !email || !password) { res.status(400).json({ error: "name, email, password requis" }); return; }
    const hashed = await bcrypt.hash(String(password), 12);
    const [user] = await db.insert(usersTable).values({
      name, email: String(email).toLowerCase().trim(),
      password: hashed, role: role ?? "customer",
      phone: phone ?? null, isActive: isActive ?? true,
    }).returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role });

    const [adminUser] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await logActivity({ userId: req.userId, userEmail: adminUser?.email, userName: adminUser?.name, action: "create", entity: "user", entityId: user.id, ip: req.ip });

    res.status(201).json(user);
  } catch (err: any) {
    if (err?.code === "23505") { res.status(409).json({ error: "Cet email est déjà utilisé" }); return; }
    next(err);
  }
});

router.patch("/backend/users/:id", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const allowed = ["name", "email", "phone", "address", "isActive", "avatarUrl", "loyaltyPoints", "walletBalance"];
    const updates: Record<string, unknown> = {};
    const body = req.body ?? {};
    for (const k of allowed) if (body[k] !== undefined) updates[k] = body[k];
    const [user] = await db.update(usersTable).set(updates as any).where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role });
    if (!user) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }
    res.json(user);
  } catch (err) { next(err); }
});

router.delete("/backend/users/:id", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isSuperAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
    if (userId === req.userId) { res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" }); return; }
    const [adminUser] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    await logActivity({ userId: req.userId, userEmail: adminUser?.email, userName: adminUser?.name, action: "delete", entity: "user", entityId: userId, ip: req.ip });
    res.json({ success: true });
  } catch (err: any) {
    if (err?.code === "23503") { res.status(409).json({ error: "Cet utilisateur est référencé par des données existantes" }); return; }
    next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// ACTIVITY AUDIT LOG
// ────────────────────────────────────────────────────────────────────────────

router.get("/backend/audit", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(200, parseInt(String(req.query.limit ?? "50"), 10));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (req.query.action) conditions.push(eq(activityLogsTable.action, String(req.query.action)));
    if (req.query.entity) conditions.push(eq(activityLogsTable.entity, String(req.query.entity)));
    if (req.query.userId) conditions.push(eq(activityLogsTable.userId, parseInt(String(req.query.userId), 10)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRow] = await Promise.all([
      db.select().from(activityLogsTable).where(where).orderBy(desc(activityLogsTable.createdAt)).limit(limit).offset(offset),
      db.select({ count: count() }).from(activityLogsTable).where(where),
    ]);

    res.json({ rows, total: totalRow[0]?.count ?? 0, page, limit });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// DATA EXPORT  (CSV | JSON)
// ────────────────────────────────────────────────────────────────────────────

router.get("/backend/export/:entity", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const { entity } = req.params;
    const fmt = String(req.query.format ?? "json").toLowerCase();
    const dateStr = new Date().toISOString().split("T")[0];

    let data: Record<string, unknown>[] = [];

    switch (entity) {
      case "orders":
        data = (await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(10000)) as any;
        break;
      case "customers":
        data = (await db.select({
          id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone,
          address: usersTable.address, loyaltyPoints: usersTable.loyaltyPoints,
          walletBalance: usersTable.walletBalance, isActive: usersTable.isActive, createdAt: usersTable.createdAt,
        }).from(usersTable).where(eq(usersTable.role, "customer")).orderBy(desc(usersTable.createdAt)).limit(10000)) as any;
        break;
      case "products":
        data = (await db.select().from(menuItemsTable).orderBy(menuItemsTable.name).limit(10000)) as any;
        break;
      case "staff":
        data = (await db.select({
          id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role,
          phone: usersTable.phone, isActive: usersTable.isActive, assignedShopId: usersTable.assignedShopId, createdAt: usersTable.createdAt,
        }).from(usersTable).where(sql`${usersTable.role} NOT IN ('customer', 'driver')`).orderBy(usersTable.name).limit(10000)) as any;
        break;
      case "restaurants":
        data = (await db.select().from(restaurantsTable).orderBy(restaurantsTable.name).limit(10000)) as any;
        break;
      case "promo-codes":
        data = (await db.select().from(promoCodesTable).orderBy(desc(promoCodesTable.createdAt)).limit(10000)) as any;
        break;
      case "drivers":
        data = (await db.select({
          id: driversTable.id, userId: driversTable.userId, vehicleType: driversTable.vehicleType,
          vehiclePlate: driversTable.vehiclePlate, isAvailable: driversTable.isAvailable,
          totalDeliveries: driversTable.totalDeliveries, rating: driversTable.rating,
          createdAt: driversTable.createdAt,
        }).from(driversTable).orderBy(desc(driversTable.createdAt)).limit(10000)) as any;
        break;
      case "refunds":
        data = (await db.select().from(refundsTable).orderBy(desc(refundsTable.createdAt)).limit(10000)) as any;
        break;
      case "audit":
        data = (await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(10000)) as any;
        break;
      default:
        res.status(400).json({ error: `Entité inconnue: ${entity}` }); return;
    }

    if (fmt === "csv") {
      const csv = toCSV(data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${entity}-${dateStr}.csv"`);
      res.send(csv);
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${entity}-${dateStr}.json"`);
      res.send(JSON.stringify(data, null, 2));
    }

    const [adminUser] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await logActivity({ userId: req.userId, userEmail: adminUser?.email, userName: adminUser?.name, action: "export", entity, details: { format: fmt, count: data.length }, ip: req.ip });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// DATA IMPORT  (JSON body)
// ────────────────────────────────────────────────────────────────────────────

router.post("/backend/import/menu-items", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const { items, restaurantId } = req.body;
    if (!Array.isArray(items) || !restaurantId) {
      res.status(400).json({ error: "items[] et restaurantId requis" }); return;
    }
    let created = 0;
    const errors: { row: number; error: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name || item.price === undefined) { errors.push({ row: i + 1, error: "name et price requis" }); continue; }
      try {
        await db.insert(menuItemsTable).values({
          restaurantId: Number(restaurantId),
          name: String(item.name),
          description: item.description ?? null,
          price: Number(item.price),
          category: item.category ?? "Main",
          imageUrl: item.imageUrl ?? null,
          isAvailable: item.isAvailable !== false,
          isPopular: item.isPopular === true,
          allergens: item.allergens ?? null,
          tags: item.tags ? (Array.isArray(item.tags) ? item.tags : String(item.tags).split(",").map((s: string) => s.trim())) : null,
          prepTimeMinutes: item.prepTimeMinutes ? Number(item.prepTimeMinutes) : null,
          calories: item.calories ? Number(item.calories) : null,
        });
        created++;
      } catch (e: any) {
        errors.push({ row: i + 1, error: e?.message ?? "Erreur" });
      }
    }

    const [adminUser] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await logActivity({ userId: req.userId, userEmail: adminUser?.email, userName: adminUser?.name, action: "import", entity: "product", details: { created, errors: errors.length, restaurantId }, ip: req.ip });

    res.json({ success: true, created, errors, total: items.length });
  } catch (err) { next(err); }
});

router.post("/backend/import/promo-codes", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isSuperAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const { codes } = req.body;
    if (!Array.isArray(codes)) { res.status(400).json({ error: "codes[] requis" }); return; }
    let created = 0;
    const errors: { row: number; error: string }[] = [];
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i];
      if (!c.code || !c.type) { errors.push({ row: i + 1, error: "code et type requis" }); continue; }
      try {
        await db.insert(promoCodesTable).values({
          code: String(c.code).toUpperCase().trim(),
          description: c.description ?? null,
          type: c.type, value: Number(c.value ?? 0),
          minOrderAmount: Number(c.minOrderAmount ?? 0),
          maxUses: c.maxUses ? Number(c.maxUses) : null,
          maxUsesPerUser: Number(c.maxUsesPerUser ?? 1),
          firstOrderOnly: c.firstOrderOnly === true,
          restaurantId: c.restaurantId ? Number(c.restaurantId) : null,
          isActive: c.isActive !== false,
          expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
        });
        created++;
      } catch (e: any) {
        errors.push({ row: i + 1, error: e?.message ?? "Erreur" });
      }
    }
    res.json({ success: true, created, errors, total: codes.length });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// SYSTEM MONITORING
// ────────────────────────────────────────────────────────────────────────────

router.get("/backend/system", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isSuperAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden: super_admin requis" }); return; }
  try {
    const uptimeSeconds = process.uptime();
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpuLoad = os.loadavg();
    const cpus = os.cpus();

    const [orderCount, userCount, productCount, restaurantCount, auditCount] = await Promise.all([
      db.select({ count: count() }).from(ordersTable),
      db.select({ count: count() }).from(usersTable),
      db.select({ count: count() }).from(menuItemsTable),
      db.select({ count: count() }).from(restaurantsTable),
      db.select({ count: count() }).from(activityLogsTable),
    ]);

    res.json({
      uptime: uptimeSeconds,
      uptimeHuman: formatUptime(uptimeSeconds),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV ?? "development",
      /** Configured via --max-old-space-size=4096 in the start script. */
      heapMaxConfigured: 4096,
      memory: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        external: mem.external,
        systemTotal: totalMem,
        systemFree: freeMem,
        systemUsedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
      },
      cpu: {
        loadAvg1: Math.round(cpuLoad[0] * 100) / 100,
        loadAvg5: Math.round(cpuLoad[1] * 100) / 100,
        loadAvg15: Math.round(cpuLoad[2] * 100) / 100,
        cores: cpus.length,
        model: cpus[0]?.model ?? "Unknown",
      },
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      database: {
        orders: orderCount[0]?.count ?? 0,
        users: userCount[0]?.count ?? 0,
        products: productCount[0]?.count ?? 0,
        restaurants: restaurantCount[0]?.count ?? 0,
        auditLogs: auditCount[0]?.count ?? 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// DB BACKUP
// ────────────────────────────────────────────────────────────────────────────

router.post("/backend/db/backup", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isSuperAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden: super_admin requis" }); return; }
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) { res.status(500).json({ error: "DATABASE_URL non configuré" }); return; }
    const { stdout } = await execAsync(`pg_dump "${dbUrl}" --no-owner --no-acl --format=plain`, {
      maxBuffer: 100 * 1024 * 1024,
      timeout: 60000,
    });
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
    const [adminUser] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    await logActivity({ userId: req.userId, userEmail: adminUser?.email, userName: adminUser?.name, action: "db_backup", entity: "system", ip: req.ip });
    res.setHeader("Content-Type", "application/sql");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(stdout);
  } catch (err: any) {
    res.status(500).json({ error: "Backup échoué: " + (err?.message ?? "pg_dump unavailable") });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// AUTO-CLOSE SCHEDULER — exported for use in app.ts
// ────────────────────────────────────────────────────────────────────────────

/**
 * Checks all restaurants against their weekly schedule every minute.
 * Auto-opens/closes isOpen based on current day + time.
 */
export function startRestaurantAutoCloseScheduler() {
  const tick = async () => {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const allHours = await db.select().from(restaurantHoursTable).where(eq(restaurantHoursTable.dayOfWeek, dayOfWeek));
      if (allHours.length === 0) return;

      const restaurantIds = allHours.map((h) => h.restaurantId);
      const restaurants = await db.select({ id: restaurantsTable.id, isOpen: restaurantsTable.isOpen })
        .from(restaurantsTable)
        .where(inArray(restaurantsTable.id, restaurantIds));

      const restaurantMap = new Map(restaurants.map((r) => [r.id, r.isOpen]));

      for (const h of allHours) {
        const shouldBeOpen = !h.isClosed && (() => {
          const [oh, om] = h.openTime.split(":").map(Number);
          const [ch, cm] = h.closeTime.split(":").map(Number);
          const open = oh * 60 + om;
          const close = ch * 60 + cm;
          return currentMinutes >= open && currentMinutes < close;
        })();

        const currentlyOpen = restaurantMap.get(h.restaurantId);
        if (shouldBeOpen !== currentlyOpen) {
          await db.update(restaurantsTable)
            .set({ isOpen: shouldBeOpen })
            .where(eq(restaurantsTable.id, h.restaurantId));
        }
      }
    } catch (e) {
      console.error("[scheduler] auto-close tick failed", e);
    }
  };

  setInterval(tick, 60_000);
  tick(); // run immediately on start
  console.info("[scheduler] restaurant auto-close started");
}

// ────────────────────────────────────────────────────────────────────────────
// APP CONFIG (public read + admin write)
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_APP_CONFIG: Record<string, unknown> = {
  defaultLanguage: "fr",
  maintenanceMode: false,
  featuredCount: 6,
  homeOrder: ["banners", "categories", "featured", "all"],
  welcomeMessage: "Bienvenue sur Jatek !",
};

async function getAppConfig(): Promise<Record<string, unknown>> {
  const rows = await db.select().from(appConfigTable);
  const config = { ...DEFAULT_APP_CONFIG };
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return config;
}

/** Public endpoint read by the mobile app at startup (no auth required). */
router.get("/app-config", async (_req, res, next): Promise<void> => {
  try { res.json(await getAppConfig()); }
  catch (err) { next(err); }
});

/** Admin: read full config */
router.get("/backend/app-config", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isSuperAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try { res.json(await getAppConfig()); }
  catch (err) { next(err); }
});

/** Admin: upsert one or more config keys */
router.put("/backend/app-config", requireAuth, async (req: AuthedRequest, res, next): Promise<void> => {
  if (!isSuperAdmin(req.userRole)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const entries = Object.entries(req.body ?? {});
    if (entries.length === 0) { res.status(400).json({ error: "No config keys provided" }); return; }
    for (const [key, value] of entries) {
      await db
        .insert(appConfigTable)
        .values({ key, value })
        .onConflictDoUpdate({
          target: appConfigTable.key,
          set: { value: value as any, updatedAt: new Date() },
        });
    }
    res.json({ ok: true, updated: entries.length });
  } catch (err) { next(err); }
});

export default router;

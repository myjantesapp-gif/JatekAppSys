import { Router, type IRouter } from "express";
import { db, quotesTable, restaurantsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";
import { publish } from "../lib/sse";

const router: IRouter = Router();

const VALID_STATUSES = ["pending", "quoted", "accepted", "rejected", "cancelled"] as const;
type QuoteStatus = typeof VALID_STATUSES[number];

function parseCreateBody(body: any): { restaurantId: number; subject: string; description: string } | string {
  if (!body || typeof body !== "object") return "Invalid body";
  const rid = Number(body.restaurantId);
  if (!Number.isInteger(rid) || rid <= 0) return "restaurantId must be a positive integer";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (subject.length < 2 || subject.length > 200) return "subject must be 2-200 chars";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 2 || description.length > 4000) return "description must be 2-4000 chars";
  return { restaurantId: rid, subject, description };
}

function parseUpdateBody(body: any): { status?: QuoteStatus; quotedAmount?: number; merchantNotes?: string } | string {
  if (!body || typeof body !== "object") return "Invalid body";
  const out: { status?: QuoteStatus; quotedAmount?: number; merchantNotes?: string } = {};
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !VALID_STATUSES.includes(body.status as any)) return "Invalid status";
    out.status = body.status as QuoteStatus;
  }
  if (body.quotedAmount !== undefined) {
    const n = Number(body.quotedAmount);
    if (!Number.isFinite(n) || n < 0) return "Invalid quotedAmount";
    out.quotedAmount = n;
  }
  if (body.merchantNotes !== undefined) {
    if (typeof body.merchantNotes !== "string" || body.merchantNotes.length > 2000) return "Invalid merchantNotes";
    out.merchantNotes = body.merchantNotes;
  }
  return out;
}

router.post("/quotes", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const parsed = parseCreateBody(req.body);
  if (typeof parsed === "string") {
    res.status(400).json({ error: parsed });
    return;
  }

  const userId = req.userId!;
  const { restaurantId, subject, description } = parsed;

  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, restaurantId)).limit(1);
  if (!restaurant) {
    res.status(404).json({ error: "Merchant not found" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const [quote] = await db.insert(quotesTable).values({
    userId,
    restaurantId,
    restaurantName: restaurant.name,
    userName: user?.name || "Customer",
    userPhone: user?.phone || null,
    subject,
    description,
    status: "pending",
  }).returning();

  publish(`restaurant:${restaurantId}`, "quote_new", quote);

  res.status(201).json(quote);
});

/** Returns the set of restaurant IDs owned by `userId` (admins get null = all). */
async function ownedRestaurantIds(userId: number, role?: string): Promise<number[] | null> {
  if (role === "admin") return null;
  const rows = await db.select({ id: restaurantsTable.id }).from(restaurantsTable).where(eq(restaurantsTable.ownerId, userId));
  return rows.map((r) => r.id);
}

router.get("/quotes", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const restaurantIdQ = req.query.restaurantId ? parseInt(String(req.query.restaurantId), 10) : null;
  const role = req.userRole;
  const userId = req.userId!;

  if (restaurantIdQ && (role === "admin" || role === "restaurant_owner")) {
    const owned = await ownedRestaurantIds(userId, role);
    if (owned !== null && !owned.includes(restaurantIdQ)) {
      res.status(403).json({ error: "Not your restaurant" });
      return;
    }
    const list = await db.select().from(quotesTable).where(eq(quotesTable.restaurantId, restaurantIdQ));
    res.json(list);
    return;
  }

  const list = await db.select().from(quotesTable).where(eq(quotesTable.userId, userId));
  res.json(list);
});

async function canAccessQuote(req: AuthedRequest, quote: { userId: number; restaurantId: number }): Promise<boolean> {
  if (req.userRole === "admin") return true;
  if (quote.userId === req.userId) return true;
  if (req.userRole === "restaurant_owner") {
    const owned = await ownedRestaurantIds(req.userId!, req.userRole);
    return owned !== null && owned.includes(quote.restaurantId);
  }
  return false;
}

router.get("/quotes/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, id)).limit(1);
  if (!quote) { res.status(404).json({ error: "Not found" }); return; }
  if (!(await canAccessQuote(req, quote))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(quote);
});

router.patch("/quotes/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = parseUpdateBody(req.body);
  if (typeof parsed === "string") { res.status(400).json({ error: parsed }); return; }
  if (parsed.status === undefined && parsed.quotedAmount === undefined && parsed.merchantNotes === undefined) {
    res.status(400).json({ error: "Empty update payload" });
    return;
  }

  const [existing] = await db.select().from(quotesTable).where(eq(quotesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const isOwner = existing.userId === req.userId;
  let isMerchant = false;
  if (req.userRole === "admin") {
    isMerchant = true;
  } else if (req.userRole === "restaurant_owner") {
    const owned = await ownedRestaurantIds(req.userId!, req.userRole);
    isMerchant = owned !== null && owned.includes(existing.restaurantId);
  }

  if (!isOwner && !isMerchant) { res.status(403).json({ error: "Forbidden" }); return; }

  // Customers may only accept/reject a quoted offer; merchants can quote/cancel.
  const update: Partial<typeof existing> = {};
  if (parsed.status) {
    if (isOwner && !isMerchant && !["accepted", "rejected", "cancelled"].includes(parsed.status)) {
      res.status(403).json({ error: "Customers can only accept/reject/cancel" });
      return;
    }
    update.status = parsed.status;
  }
  if (parsed.quotedAmount != null && isMerchant) update.quotedAmount = parsed.quotedAmount;
  if (parsed.merchantNotes != null && isMerchant) update.merchantNotes = parsed.merchantNotes;
  if (isMerchant && update.quotedAmount != null && !update.status) update.status = "quoted";

  const [quote] = await db.update(quotesTable).set(update).where(eq(quotesTable.id, id)).returning();

  publish(`quote:${quote.id}`, "quote_update", quote);
  publish(`restaurant:${quote.restaurantId}`, "quote_update", quote);

  res.json(quote);
});

/** HTML invoice page for a delivered/accepted order — restricted to order owner, owning merchant, or admin. */
router.get("/orders/:id/invoice", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const orderId = parseInt(String(req.params.id), 10);
  if (isNaN(orderId)) { res.status(400).send("Invalid id"); return; }

  const { ordersTable, orderItemsTable } = await import("@workspace/db");
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) { res.status(404).send("Order not found"); return; }

  const isOwner = order.userId === req.userId;
  let isMerchant = req.userRole === "admin";
  if (!isMerchant && req.userRole === "restaurant_owner") {
    const owned = await ownedRestaurantIds(req.userId!, req.userRole);
    isMerchant = owned !== null && owned.includes(order.restaurantId);
  }
  if (!isOwner && !isMerchant) { res.status(403).send("Forbidden"); return; }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, order.restaurantId)).limit(1);

  const issued = new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const number = `JTK-${String(order.id).padStart(6, "0")}`;
  const tva = 0; // VAT placeholder; customise per region
  const total = order.total;

  const itemsHtml = items.map((i) => `
    <tr>
      <td>${i.menuItemName}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">${i.unitPrice.toFixed(2)} MAD</td>
      <td style="text-align:right">${i.totalPrice.toFixed(2)} MAD</td>
    </tr>`).join("");

  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Facture ${number}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,Inter,Segoe UI,sans-serif;margin:0;padding:24px;color:#0A1B3D;background:#fff;max-width:780px;margin-inline:auto;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #E2006A}
  .brand{font-size:28px;font-weight:800;color:#E2006A;letter-spacing:-0.02em}
  .meta{text-align:right;font-size:13px;color:#475569}
  .meta strong{color:#0A1B3D;display:block;font-size:18px;margin-bottom:4px}
  .parties{display:flex;gap:24px;margin-bottom:24px}
  .party{flex:1;background:#F8FAFC;padding:14px 16px;border-radius:10px}
  .party h3{margin:0 0 8px 0;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748B;font-weight:600}
  .party p{margin:2px 0;font-size:14px}
  table{width:100%;border-collapse:collapse;margin:16px 0}
  th{background:#0A1B3D;color:#fff;padding:10px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  th:nth-child(2){text-align:center}
  th:nth-child(3),th:nth-child(4){text-align:right}
  td{padding:12px 10px;border-bottom:1px solid #E2E8F0;font-size:14px}
  .totals{margin-top:8px;margin-left:auto;width:300px}
  .totals .row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}
  .totals .grand{border-top:2px solid #0A1B3D;margin-top:6px;padding-top:10px;font-size:18px;font-weight:800;color:#E2006A}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;text-align:center}
  @media print{body{padding:0}}
</style>
</head><body>
  <div class="header">
    <div>
      <div class="brand">Jatek</div>
      <div style="font-size:12px;color:#64748B">Facture officielle</div>
    </div>
    <div class="meta">
      <strong>FACTURE</strong>
      N° ${number}<br/>
      Date : ${issued}<br/>
      Statut : ${order.status === "delivered" ? "Payée" : order.status}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Vendeur</h3>
      <p><strong>${restaurant?.name ?? order.restaurantName}</strong></p>
      <p>${restaurant?.address ?? ""}</p>
      ${restaurant?.phone ? `<p>${restaurant.phone}</p>` : ""}
    </div>
    <div class="party">
      <h3>Client</h3>
      <p><strong>${order.userName}</strong></p>
      <p>${order.deliveryAddress}</p>
    </div>
  </div>

  <table>
    <thead><tr><th>Description</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Sous-total</span><span>${order.subtotal.toFixed(2)} MAD</span></div>
    <div class="row"><span>Frais de livraison</span><span>${order.deliveryFee.toFixed(2)} MAD</span></div>
    ${tva > 0 ? `<div class="row"><span>TVA</span><span>${tva.toFixed(2)} MAD</span></div>` : ""}
    <div class="row grand"><span>Total TTC</span><span>${total.toFixed(2)} MAD</span></div>
  </div>

  <div class="footer">
    Merci pour votre commande — Jatek SAS<br/>
    Cette facture a été générée automatiquement et ne nécessite pas de signature.
  </div>
</body></html>`);
});

/** HTML quote document — restricted to quote owner, owning merchant, or admin. */
router.get("/quotes/:id/pdf", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).send("Invalid id"); return; }
  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, id)).limit(1);
  if (!quote) { res.status(404).send("Not found"); return; }
  if (!(await canAccessQuote(req, quote))) { res.status(403).send("Forbidden"); return; }
  const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, quote.restaurantId)).limit(1);
  const issued = new Date(quote.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const number = `DEV-${String(quote.id).padStart(6, "0")}`;

  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Devis ${number}</title>
<style>body{font-family:Inter,system-ui,sans-serif;margin:0;padding:24px;color:#0A1B3D;background:#fff;max-width:780px;margin-inline:auto}
.header{display:flex;justify-content:space-between;border-bottom:2px solid #E2006A;padding-bottom:16px;margin-bottom:24px}
.brand{font-size:28px;font-weight:800;color:#E2006A}
.box{background:#F8FAFC;padding:14px 16px;border-radius:10px;margin-bottom:14px}
.box h3{margin:0 0 6px 0;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748B}
.amount{margin-top:24px;padding:18px;background:#0A1B3D;color:#fff;border-radius:12px;display:flex;justify-content:space-between;align-items:center;font-size:18px;font-weight:700}
.amount .v{font-size:24px;color:#E2006A}
.status{display:inline-block;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;background:#E2006A;color:#fff}
.footer{margin-top:32px;font-size:12px;color:#64748B;text-align:center;border-top:1px solid #E2E8F0;padding-top:14px}
</style></head><body>
<div class="header">
  <div><div class="brand">Jatek</div><div style="font-size:12px;color:#64748B">Devis</div></div>
  <div style="text-align:right"><strong>DEVIS N° ${number}</strong><br/>Date : ${issued}<br/><span class="status">${quote.status}</span></div>
</div>
<div class="box"><h3>Prestataire</h3><p><strong>${restaurant?.name ?? quote.restaurantName}</strong></p><p>${restaurant?.address ?? ""}</p>${restaurant?.phone ? `<p>${restaurant.phone}</p>` : ""}</div>
<div class="box"><h3>Client</h3><p><strong>${quote.userName}</strong></p>${quote.userPhone ? `<p>${quote.userPhone}</p>` : ""}</div>
<div class="box"><h3>Sujet</h3><p>${quote.subject}</p></div>
<div class="box"><h3>Description</h3><p style="white-space:pre-wrap">${quote.description}</p></div>
${quote.merchantNotes ? `<div class="box"><h3>Notes du prestataire</h3><p style="white-space:pre-wrap">${quote.merchantNotes}</p></div>` : ""}
${quote.quotedAmount != null ? `<div class="amount"><span>Montant proposé</span><span class="v">${quote.quotedAmount.toFixed(2)} MAD</span></div>` : ""}
<div class="footer">Devis valable 30 jours — Jatek SAS</div>
</body></html>`);
});

export default router;

import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable, driversTable, otpCodesTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import {
  sendOtpMessage, sendOtpEmail, anyOtpProviderConfigured,
  sendTwilioVerify, checkTwilioVerify, twilioVerifyConfigured,
} from "../lib/otpMessaging.js";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET!; // validated at startup by auth middleware
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;
const OTP_RATE_LIMIT_MINUTES = 1;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Normalize a phone number to E.164 format.
 * - If it already starts with +, trust it as-is (international format from frontend picker).
 * - Handle 00 prefix → +
 * - Legacy Moroccan shorthand (06/07 → +212…)
 */
function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-\(\)\.]/g, "");
  if (p.startsWith("+")) return p;
  if (p.startsWith("00")) return "+" + p.slice(2);
  if (p.startsWith("0")) return "+212" + p.slice(1); // legacy Moroccan
  if (/^[67]/.test(p)) return "+212" + p;            // legacy Moroccan bare digits
  return p;
}

// OTP messaging is delegated to lib/otpMessaging.ts. Phone OTP is WhatsApp-only;
// email OTP is delivered through the configured email provider.

// ─── Register (email/password, for admin/driver panel) ──────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, phone } = parsed.data;
  // Public registration always creates a customer — elevated roles (admin,
  // super_admin, driver, etc.) must be assigned through the backend panel.
  const role = "customer";
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    name, email, password: hashed, role,
    phone: phone ?? null, loyaltyPoints: 0, isActive: true,
  }).returning();

  // Public registration always yields role="customer"; dead branch kept for
  // future backend-panel usage where role could be "driver".
  if ((role as string) === "driver") {
    await db.insert(driversTable).values({
      userId: user.id, name: user.name, phone: user.phone ?? null,
      isAvailable: true, totalDeliveries: 0,
    });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  const { password: _pw, ...safeUser } = user;
  res.status(201).json({ token, user: safeUser });
});

// ─── Login (email/password) ──────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// ─── Send OTP (email or WhatsApp) ──────────────────────────────────────────────
// Phone OTP: Twilio Verify Service (preferred) → legacy WhatsApp providers.
// Email OTP: Resend (DB-managed, unchanged).
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const { phone, email } = req.body;

  const isEmailMode = !phone && email && typeof email === "string" && email.includes("@");

  if (!isEmailMode && (!phone || typeof phone !== "string" || phone.trim().length < 7)) {
    res.status(400).json({ error: "Numéro de téléphone ou adresse email requis" });
    return;
  }

  const identifier = isEmailMode
    ? email.trim().toLowerCase()
    : normalizePhone(phone.trim());

  // ── Phone OTP via Twilio Verify (no DB row needed) ──────────────────────────
  if (!isEmailMode && twilioVerifyConfigured()) {
    try {
      await sendTwilioVerify(identifier, "whatsapp");
      res.json({
        success: true,
        channel: "twilio-verify-whatsapp",
        message: `Code envoyé via WhatsApp à ${identifier}`,
        otpSent: true,
      });
    } catch (err: any) {
      console.error(`[OTP] Twilio Verify send failed for ${identifier}:`, err?.message ?? err);
      res.status(502).json({ error: "Impossible d'envoyer le code WhatsApp. Réessayez dans un instant." });
    }
    return;
  }

  // ── Email OTP / legacy phone OTP — DB-managed ───────────────────────────────
  const recentOtp = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.phone, identifier),
        gt(otpCodesTable.createdAt, new Date(Date.now() - OTP_RATE_LIMIT_MINUTES * 60 * 1000))
      )
    )
    .limit(1);

  if (recentOtp.length > 0) {
    res.status(429).json({ error: "Veuillez attendre avant de demander un nouveau code" });
    return;
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await db.insert(otpCodesTable).values({ phone: identifier, code, expiresAt });

  const messageBody = `Votre code Jatek : ${code}\nValable ${OTP_EXPIRY_MINUTES} minutes. Ne le communiquez à personne.`;

  const providerReady = await anyOtpProviderConfigured();
  const isDev = process.env.NODE_ENV !== "production";
  const isLocalWorkspace = !process.env.REPLIT_DEPLOYMENT
    && !process.env.REPLIT_DEPLOYMENT_ID
    && !process.env.REPLIT_DEPLOYMENT_DOMAIN;
  const canExposeDemoOtp = isDev && !providerReady && isLocalWorkspace;

  let actualChannel: string = "none";
  let otpSent = false;
  let deliveryFailed = false;

  try {
    let result;
    if (isEmailMode) {
      result = await sendOtpEmail(identifier, code, messageBody);
    } else {
      result = await sendOtpMessage(identifier, messageBody);
    }
    actualChannel = result.channel;
    otpSent = true;
  } catch (err: any) {
    deliveryFailed = true;
    console.error(`[OTP] all providers failed for ${identifier}:`, err?.message ?? err);
    if (!canExposeDemoOtp) {
      res.status(502).json({ error: "Impossible d'envoyer le code. Réessayez dans un instant." });
      return;
    }
  }

  res.json({
    success: true,
    channel: actualChannel,
    message: deliveryFailed
      ? `Code de démo (aucun provider configuré) pour ${identifier}`
      : `Code envoyé via ${actualChannel} à ${identifier}`,
    otpSent,
    demoOtp: canExposeDemoOtp ? code : undefined,
  });
});

// ─── Verify OTP ───────────────────────────────────────────────────────────────
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const { phone, email, code, name, password, intent, role } = req.body;

  if ((!phone && !email) || !code) {
    res.status(400).json({ error: "Numéro de téléphone (ou email) et code requis" });
    return;
  }

  const isEmailMode = !phone && email && typeof email === "string" && email.includes("@");
  const identifier = isEmailMode
    ? email.trim().toLowerCase()
    : normalizePhone((phone as string).trim());

  // ── Phone OTP via Twilio Verify ─────────────────────────────────────────────
  if (!isEmailMode && twilioVerifyConfigured()) {
    let verifyStatus: "approved" | "pending" | "expired";
    try {
      verifyStatus = await checkTwilioVerify(identifier, (code as string).trim());
    } catch (err: any) {
      console.error(`[OTP] Twilio Verify check failed for ${identifier}:`, err?.message ?? err);
      res.status(502).json({ error: "Impossible de vérifier le code. Réessayez." });
      return;
    }

    if (verifyStatus === "expired") {
      res.status(400).json({ error: "Code expiré ou introuvable. Demandez un nouveau code." });
      return;
    }
    if (verifyStatus !== "approved") {
      res.status(400).json({ error: "Code incorrect." });
      return;
    }

    // Code approved — proceed to account creation (signup) or login lookup below.
    const isSignup = intent === "signup";
    if (!isSignup && role !== "driver") {
      res.status(400).json({ error: "Le code WhatsApp est réservé à l'inscription" });
      return;
    }

    if (isSignup) {
      if (!phone || !name || typeof name !== "string" || name.trim().length < 2) {
        res.status(400).json({ error: "Nom requis pour créer le compte" });
        return;
      }
      if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        res.status(400).json({ error: "Adresse email valide requise" });
        return;
      }
      if (!password || typeof password !== "string" || password.length < 8) {
        res.status(400).json({ error: "Le mot de passe doit comporter au moins 8 caractères" });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPhone = normalizePhone(String(phone).trim());
      const [emailUser, phoneUser] = await Promise.all([
        db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1),
        db.select().from(usersTable).where(eq(usersTable.phone, normalizedPhone)).limit(1),
      ]);
      if (emailUser.length > 0) {
        res.status(409).json({ error: "Cette adresse email est déjà utilisée" });
        return;
      }
      if (phoneUser.length > 0) {
        res.status(409).json({ error: "Ce numéro WhatsApp possède déjà un compte" });
        return;
      }

      const hashed = await bcrypt.hash(password, 10);
      const [newUser] = await db.insert(usersTable).values({
        name: name.trim(),
        email: normalizedEmail,
        password: hashed,
        role: "customer",
        phone: normalizePhone(String(phone).trim()),
        loyaltyPoints: 0,
        isActive: true,
      }).returning();

      const token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: "30d" });
      const { password: _pw, ...safeUser } = newUser;
      res.status(201).json({ token, user: safeUser, isNewUser: true });
      return;
    }

    // Driver login via phone OTP
    const [existingUser] = await db
      .select().from(usersTable).where(eq(usersTable.phone, identifier)).limit(1);
    if (!existingUser) {
      res.status(404).json({ error: "Aucun compte trouvé pour ce numéro" });
      return;
    }
    const token = jwt.sign({ userId: existingUser.id, role: existingUser.role }, JWT_SECRET, { expiresIn: "30d" });
    const { password: _pw, ...safeUser } = existingUser;
    res.json({ token, user: safeUser, isNewUser: false });
    return;
  }

  // ── Email OTP / legacy phone OTP — DB-managed ───────────────────────────────
  const now = new Date();

  const [otpRecord] = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.phone, identifier),
        eq(otpCodesTable.used, false),
        gt(otpCodesTable.expiresAt, now)
      )
    )
    .orderBy(desc(otpCodesTable.createdAt))
    .limit(1);

  if (!otpRecord) {
    res.status(400).json({ error: "Code expiré ou introuvable. Demandez un nouveau code." });
    return;
  }

  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    res.status(400).json({ error: "Trop de tentatives. Demandez un nouveau code." });
    return;
  }

  if (otpRecord.code !== code.trim()) {
    await db
      .update(otpCodesTable)
      .set({ attempts: otpRecord.attempts + 1 })
      .where(eq(otpCodesTable.id, otpRecord.id));

    const remaining = OTP_MAX_ATTEMPTS - (otpRecord.attempts + 1);
    res.status(400).json({
      error: remaining > 0
        ? `Code incorrect. ${remaining} tentative${remaining === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"}.`
        : "Trop de tentatives. Demandez un nouveau code.",
    });
    return;
  }

  const isSignup = intent === "signup";
  if (!isSignup && !isEmailMode && role !== "driver") {
    res.status(400).json({ error: "Le code WhatsApp est réservé à l'inscription" });
    return;
  }

  if (isSignup) {
    if (!phone || !name || typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "Nom requis pour créer le compte" });
      return;
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: "Adresse email valide requise" });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Le mot de passe doit comporter au moins 8 caractères" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(String(phone).trim());
    const [emailUser, phoneUser] = await Promise.all([
      db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1),
      db.select().from(usersTable).where(eq(usersTable.phone, normalizedPhone)).limit(1),
    ]);
    if (emailUser.length > 0) {
      res.status(409).json({ error: "Cette adresse email est déjà utilisée" });
      return;
    }
    if (phoneUser.length > 0) {
      res.status(409).json({ error: "Ce numéro WhatsApp possède déjà un compte" });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(usersTable).values({
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      role: "customer",
      phone: normalizedPhone,
      loyaltyPoints: 0,
      isActive: true,
    }).returning();

    await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otpRecord.id));
    const token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: "30d" });
    const { password: _pw, ...safeUser } = newUser;
    res.status(201).json({ token, user: safeUser, isNewUser: true });
    return;
  }

  await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otpRecord.id));

  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(isEmailMode
      ? eq(usersTable.email, identifier)
      : eq(usersTable.phone, identifier))
    .limit(1);

  let user = existingUser;
  const isNewUser = !user;

  if (!user) {
    const userName = name?.trim() || (
      isEmailMode
        ? identifier.split("@")[0] || "Jatek user"
        : `User ${identifier.slice(-4)}`
    );
    // OTP-created accounts are always customers — elevated roles must be assigned via the admin panel.
    const userRole = "customer";
    const accountEmail = isEmailMode
      ? identifier
      : `phone_${identifier.replace(/[^0-9]/g, "")}@jatek.local`;
    const dummyPassword = await bcrypt.hash(crypto.randomUUID(), 10);

    const [newUser] = await db.insert(usersTable).values({
      name: userName, email: accountEmail, password: dummyPassword,
      role: userRole, phone: isEmailMode ? null : identifier, loyaltyPoints: 0, isActive: true,
    }).returning();

    if ((userRole as string) === "driver") {
      await db.insert(driversTable).values({
        userId: newUser.id, name: newUser.name, phone: newUser.phone ?? null,
        isAvailable: true, totalDeliveries: 0,
      });
    }
    user = newUser;
  } else if (name?.trim() && name.trim() !== user.name) {
    const [updated] = await db
      .update(usersTable)
      .set({ name: name.trim() })
      .where(eq(usersTable.id, user.id))
      .returning();
    user = updated;
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser, isNewUser });
});

// ─── Update name after OTP for new users ─────────────────────────────────────
router.patch("/auth/update-name", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  let payload: { userId: number };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    res.status(400).json({ error: "Le prénom doit comporter au moins 2 caractères" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ name: name.trim() })
    .where(eq(usersTable.id, payload.userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }

  const { password: _pw, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ─── Get current user ─────────────────────────────────────────────────────────
router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }
    const { password: _pw, ...safeUser } = user;

    // For drivers, attach the driver record so the mobile app can resolve the
    // driver id (which differs from the user id) without a second round-trip.
    let driver: unknown = undefined;
    if (user.role === "driver") {
      const [d] = await db
        .select()
        .from(driversTable)
        .where(eq(driversTable.userId, user.id))
        .limit(1);
      if (d) driver = d;
    }

    res.json({ ...safeUser, driver });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// ─── Forgot password — send OTP to user's phone ──────────────────────────────
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email requis" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  const isDev = process.env.NODE_ENV !== "production";
  const isLocalWorkspace = !process.env.REPLIT_DEPLOYMENT
    && !process.env.REPLIT_DEPLOYMENT_ID
    && !process.env.REPLIT_DEPLOYMENT_DOMAIN;
  const providerReady = await anyOtpProviderConfigured();
  const canExposeDemoOtp = isDev && !providerReady && isLocalWorkspace;

  // Constant-shape response — never reveal whether the email exists on the system.
  const genericResponse: Record<string, unknown> = {
    success: true,
    message: "Si un compte est associé à cet email, un code a été envoyé.",
  };

  if (!user) {
    res.json(genericResponse);
    return;
  }

  // Use phone if available, otherwise fall back to the user's actual email
  const isRealEmail = normalizedEmail && !normalizedEmail.endsWith("@jatek.local");
  const hasPhone = !!user.phone;

  if (!hasPhone && !isRealEmail) {
    res.json(genericResponse);
    return;
  }

  // Pick the primary identifier for this OTP
  const identifier = hasPhone ? normalizePhone(user.phone!) : normalizedEmail;

  // Rate limit (silent — same response shape, no 429 leak)
  const recentOtp = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.phone, identifier),
        gt(otpCodesTable.createdAt, new Date(Date.now() - OTP_RATE_LIMIT_MINUTES * 60 * 1000))
      )
    )
    .limit(1);

  if (recentOtp.length > 0) {
    res.json(genericResponse);
    return;
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await db.insert(otpCodesTable).values({ phone: identifier, code, expiresAt });

  const messageBody = `Code de réinitialisation Jatek : ${code}\nValable ${OTP_EXPIRY_MINUTES} minutes.`;

  try {
    if (hasPhone) {
      await sendOtpMessage(identifier, messageBody);
    } else {
      await sendOtpEmail(normalizedEmail, code, messageBody);
    }
  } catch (err: any) {
    // If WhatsApp delivery fails, also try email as fallback (when we have a real email)
    if (hasPhone && isRealEmail) {
      try {
        await sendOtpEmail(normalizedEmail, code, messageBody);
      } catch (emailErr: any) {
        console.error(`[forgot-password] email fallback also failed for ${normalizedEmail}:`, emailErr?.message ?? emailErr);
      }
    } else {
      console.error(`[forgot-password] delivery failed for ${identifier}:`, err?.message ?? err);
    }
  }

  // Demo OTP only ever exposed in local-workspace dev with no provider configured.
  if (canExposeDemoOtp) {
    genericResponse.demoOtp = code;
  }

  res.json(genericResponse);
});

// ─── Reset password using OTP ────────────────────────────────────────────────
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { email, code, newPassword } = req.body ?? {};
  if (!email || !code || !newPassword) {
    res.status(400).json({ error: "Email, code et nouveau mot de passe requis" });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ error: "Le mot de passe doit comporter au moins 6 caractères" });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  if (!user) {
    res.status(400).json({ error: "Code invalide ou expiré" });
    return;
  }

  // Look up the OTP using the same identifier that forgot-password stored it
  // under: phone (normalised) when available, otherwise the user's real email.
  const isRealEmail = normalizedEmail && !normalizedEmail.endsWith("@jatek.local");
  const hasPhone = !!user.phone;
  const otpIdentifier = hasPhone
    ? normalizePhone(user.phone!)
    : isRealEmail
      ? normalizedEmail
      : null;

  if (!otpIdentifier) {
    res.status(400).json({ error: "Code invalide ou expiré" });
    return;
  }

  const now = new Date();

  const [otpRecord] = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.phone, otpIdentifier),
        eq(otpCodesTable.used, false),
        gt(otpCodesTable.expiresAt, now)
      )
    )
    .orderBy(desc(otpCodesTable.createdAt))
    .limit(1);

  if (!otpRecord) {
    res.status(400).json({ error: "Code expiré ou introuvable. Demandez un nouveau code." });
    return;
  }

  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    res.status(400).json({ error: "Trop de tentatives. Demandez un nouveau code." });
    return;
  }

  if (otpRecord.code !== String(code).trim()) {
    await db
      .update(otpCodesTable)
      .set({ attempts: otpRecord.attempts + 1 })
      .where(eq(otpCodesTable.id, otpRecord.id));
    const remaining = OTP_MAX_ATTEMPTS - (otpRecord.attempts + 1);
    res.status(400).json({
      error: remaining > 0
        ? `Code incorrect. ${remaining} tentative${remaining === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"}.`
        : "Trop de tentatives. Demandez un nouveau code.",
    });
    return;
  }

  await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otpRecord.id));

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, user.id));

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  const { password: _pw, ...safeUser } = user;
  res.json({ success: true, token, user: safeUser });
});

// ─── OTP Provider Diagnostic (dev-only) ──────────────────────────────────────
// GET /api/auth/otp-diagnostic  — tests each provider without sending a real message.
// Returns 403 in production.
router.get("/auth/otp-diagnostic", async (_req, res): Promise<void> => {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT) {
    res.status(403).json({ error: "Not available in production" });
    return;
  }

  const results: Record<string, unknown> = {};

  // ── Twilio ──────────────────────────────────────────────────────────────────
  try {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthKey = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_KEY;
    const twilioApiKeySid = process.env.TWILIO_API_KEY_SID;
    const twilioApiKeySecret = process.env.TWILIO_API_KEY_SECRET;
    const twilioPhone = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;

    const twilioConfig = {
      TWILIO_ACCOUNT_SID: twilioAccountSid ? `${twilioAccountSid.slice(0, 4)}...${twilioAccountSid.slice(-4)}` : "NOT SET",
      TWILIO_AUTH_KEY: twilioAuthKey ? `${twilioAuthKey.slice(0, 4)}...${twilioAuthKey.slice(-4)}` : "NOT SET",
      TWILIO_API_KEY_SID: twilioApiKeySid ? `${twilioApiKeySid.slice(0, 4)}...${twilioApiKeySid.slice(-4)}` : "NOT SET",
      TWILIO_API_KEY_SECRET: twilioApiKeySecret ? `${twilioApiKeySecret.slice(0, 4)}...****` : "NOT SET",
      TWILIO_FROM_NUMBER: twilioPhone || "NOT SET",
    };

    // Determine which auth mode will be used
    let authMode = "none";
    if (twilioApiKeySid?.startsWith("SK") && twilioApiKeySecret) {
      authMode = "API Key (TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET)";
    } else if (twilioAuthKey?.startsWith("SK") && twilioApiKeySecret) {
      authMode = "API Key (TWILIO_AUTH_KEY as SK + TWILIO_API_KEY_SECRET)";
    } else if (twilioAuthKey) {
      authMode = "Auth Token (TWILIO_AUTH_KEY)";
    }

    // Lightweight test: fetch account info from Twilio REST API
    let twilioApiTest: Record<string, unknown> = {};
    if (twilioAccountSid && twilioAccountSid.startsWith("AC")) {
      try {
        // Try with API Key first if available
        let testUser = twilioApiKeySid || twilioAuthKey;
        let testPass = twilioApiKeySid?.startsWith("SK") ? twilioApiKeySecret : twilioAuthKey;
        if (twilioApiKeySid?.startsWith("SK") && twilioApiKeySecret) {
          testUser = twilioApiKeySid;
          testPass = twilioApiKeySecret;
        }
        const authHeader = Buffer.from(`${testUser}:${testPass}`).toString("base64");
        const resp = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}.json`,
          { headers: { Authorization: `Basic ${authHeader}` } }
        );
        const body = await resp.json() as any;
        if (resp.ok) {
          twilioApiTest = { status: "OK", accountStatus: body.status, friendlyName: body.friendly_name };
        } else {
          twilioApiTest = { status: "FAILED", httpStatus: resp.status, error: body.message || body.detail };
        }
      } catch (e: any) {
        twilioApiTest = { status: "ERROR", message: e?.message };
      }
    }

    results.twilio = { config: twilioConfig, authMode, apiTest: twilioApiTest };
  } catch (e: any) {
    results.twilio = { error: e?.message };
  }

  // ── Resend ──────────────────────────────────────────────────────────────────
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    // RESEND_EMAIL_FROM accepted as alias for RESEND_FROM_EMAIL.
    const resendFrom = process.env.RESEND_FROM_EMAIL || process.env.RESEND_EMAIL_FROM;

    const resendConfig = {
      RESEND_API_KEY: resendApiKey ? `${resendApiKey.slice(0, 6)}...****` : "NOT SET",
      RESEND_FROM_EMAIL: resendFrom || "NOT SET",
      _from_alias: process.env.RESEND_FROM_EMAIL ? "RESEND_FROM_EMAIL" : process.env.RESEND_EMAIL_FROM ? "RESEND_EMAIL_FROM (alias)" : "none",
    };

    // Test by fetching Resend account info
    let resendApiTest: Record<string, unknown> = {};
    if (resendApiKey) {
      try {
        const resp = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${resendApiKey}`, Accept: "application/json" },
        });
        const body = await resp.json() as any;
        if (resp.ok) {
          const domains = Array.isArray(body.data) ? body.data : (body.domains || []);
          const verified = domains.filter((d: any) => d.status === "verified").map((d: any) => d.name);
          const pending = domains.filter((d: any) => d.status !== "verified").map((d: any) => d.name);
          resendApiTest = {
            status: "API_KEY_OK",
            verifiedDomains: verified,
            pendingDomains: pending,
            fromEmailDomainVerified: resendFrom
              ? verified.some((d: string) => resendFrom.endsWith(`@${d}`) || resendFrom.endsWith(`.${d}`))
              : false,
          };
        } else {
          resendApiTest = { status: "FAILED", httpStatus: resp.status, error: body.message || JSON.stringify(body) };
        }
      } catch (e: any) {
        resendApiTest = { status: "ERROR", message: e?.message };
      }
    }

    results.resend = { config: resendConfig, apiTest: resendApiTest };
  } catch (e: any) {
    results.resend = { error: e?.message };
  }

  // ── Infobip ─────────────────────────────────────────────────────────────────
  results.infobip = {
    configured: !!(process.env.INFOBIP_API_KEY && (process.env.INFOBIP_BASE_URL || process.env.INFOBIP_URL)),
    whatsappReady: !!(process.env.INFOBIP_API_KEY && (process.env.INFOBIP_BASE_URL || process.env.INFOBIP_URL) && process.env.INFOBIP_WA_SENDER),
    INFOBIP_API_KEY: process.env.INFOBIP_API_KEY ? "SET" : "NOT SET",
    INFOBIP_BASE_URL: process.env.INFOBIP_BASE_URL || process.env.INFOBIP_URL || "NOT SET",
    INFOBIP_WA_SENDER: process.env.INFOBIP_WA_SENDER ? `${process.env.INFOBIP_WA_SENDER.slice(0, 6)}****` : "NOT SET",
  };

  res.json({ ok: true, providers: results });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true });
});

router.delete("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    await db.delete(usersTable).where(eq(usersTable.id, payload.userId));
    res.json({ success: true });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;

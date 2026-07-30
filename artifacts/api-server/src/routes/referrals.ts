import { Router, type IRouter } from "express";
import { db, referralsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Get my referral code (creates one if not set) */
router.get("/referrals/my-code", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  let referralCode = user.referralCode;
  if (!referralCode) {
    // Generate a unique code
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.referralCode, code)).limit(1);
      if (!existing) break;
      code = generateCode();
      attempts++;
    }
    const [updated] = await db
      .update(usersTable)
      .set({ referralCode: code })
      .where(eq(usersTable.id, req.userId!))
      .returning();
    referralCode = updated.referralCode;
  }

  // Fetch referral history
  const referrals = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, req.userId!));

  const completed = referrals.filter((r) => r.status === "completed");
  const totalEarned = completed.reduce((acc, r) => acc + r.creditAmount, 0);

  res.json({
    referralCode,
    shareUrl: `${process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : ""}/welcome?ref=${referralCode}`,
    referrals: referrals.length,
    completedReferrals: completed.length,
    totalEarned,
    walletBalance: user.walletBalance,
  });
});

/** Apply a referral code when signing up (called after first OTP verification) */
router.post("/referrals/apply", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Code de parrainage requis" });
    return;
  }

  const [referrer] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.referralCode, code.toUpperCase().trim()))
    .limit(1);

  if (!referrer) {
    res.status(404).json({ error: "Code de parrainage invalide" });
    return;
  }

  if (referrer.id === req.userId) {
    res.status(400).json({ error: "Vous ne pouvez pas utiliser votre propre code" });
    return;
  }

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (currentUser?.referredBy) {
    res.status(400).json({ error: "Vous avez déjà utilisé un code de parrainage" });
    return;
  }

  const REFERRAL_CREDIT = 20; // MAD for referrer
  const REFERRED_CREDIT = 10; // MAD for new user

  // Mark user as referred
  await db.update(usersTable).set({ referredBy: referrer.id }).where(eq(usersTable.id, req.userId!));

  // Credit new user immediately
  await db.update(usersTable).set({
    walletBalance: (currentUser?.walletBalance ?? 0) + REFERRED_CREDIT,
  }).where(eq(usersTable.id, req.userId!));

  // Create referral record (pending — referrer gets credited after first order)
  await db.insert(referralsTable).values({
    referrerId: referrer.id,
    referredId: req.userId,
    code: code.toUpperCase().trim(),
    creditAmount: REFERRAL_CREDIT,
    referredCreditAmount: REFERRED_CREDIT,
  });

  res.json({
    success: true,
    creditAdded: REFERRED_CREDIT,
    message: `${REFERRED_CREDIT} MAD ont été ajoutés à votre portefeuille !`,
  });
});

export default router;

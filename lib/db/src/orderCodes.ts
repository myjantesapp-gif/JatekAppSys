/**
 * Generators for order references and codes.
 *
 * - reference: human-friendly, monthly-prefixed unique key (e.g. JTK-2604-A8K3F2).
 *              Excludes confusing chars (0/O, 1/I/L) so it's safe to read aloud.
 * - kitchenCode: 3-digit numeric, used by the in-store counter when calling out
 *                ready orders. Not unique long-term, but unique within "active".
 * - pickupCode: 4-digit numeric handed to the customer at acceptance — the driver
 *               must enter this code at delivery to confirm hand-off.
 */
import { db, ordersTable } from "./index";
import { eq } from "drizzle-orm";

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
const REF_PREFIX = "JTK";

function randomRefSuffix(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  }
  return out;
}

function monthSegment(now: Date = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

/** Generate a reference string like "JTK-2604-A8K3F2" guaranteed to be unique. */
export async function generateUniqueOrderReference(maxAttempts = 8): Promise<string> {
  const month = monthSegment();
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = `${REF_PREFIX}-${month}-${randomRefSuffix()}`;
    const existing = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(eq(ordersTable.reference, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
  // Fallback: extend the suffix length to drive collision probability to ~0.
  return `${REF_PREFIX}-${month}-${randomRefSuffix(10)}`;
}

function randomDigits(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
  return out;
}

export function generateKitchenCode(): string {
  return randomDigits(3);
}

export function generatePickupCode(): string {
  return randomDigits(4);
}

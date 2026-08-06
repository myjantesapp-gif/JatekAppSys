// OTP messaging with multi-provider fallback chain.
//
// Phone OTP (preferred): Twilio Verify Service
//   - env: TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_VERIFY_SID
//   - Sends WhatsApp OTP via Twilio Verify; Twilio manages code/expiry/rate-limit
//   - No DB entry needed for phone OTP when Verify is configured
//
// Phone OTP (legacy fallback — no Verify SID):
//   1. Twilio WhatsApp direct  (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WA_FROM)
//   2. Infobip WhatsApp        (INFOBIP_API_KEY + INFOBIP_BASE_URL + INFOBIP_WA_SENDER)
//
// Email: Resend (RESEND_API_KEY + RESEND_FROM_EMAIL)
//
// Twilio calls use the REST API directly (fetch) — no SDK dependency.

export type OtpChannel =
  | "infobip-whatsapp"
  | "twilio-whatsapp"
  | "resend-email";

export interface SendOtpResult {
  channel: OtpChannel;
  attempts: AttemptLog[];
}

export interface AttemptLog {
  channel: OtpChannel | "skipped";
  ok: boolean;
  reason?: string;
}

// ─── Infobip ──────────────────────────────────────────────────────────────────
function infobipBaseHost(): string | undefined {
  const raw = process.env.INFOBIP_BASE_URL || process.env.INFOBIP_URL;
  if (!raw) return undefined;
  return raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function infobipConfigured(): boolean {
  return !!(process.env.INFOBIP_API_KEY && infobipBaseHost());
}

async function sendInfobipWhatsapp(to: string, body: string): Promise<void> {
  const apiKey = process.env.INFOBIP_API_KEY!;
  const baseUrl = infobipBaseHost()!;
  const from = process.env.INFOBIP_WA_SENDER;
  if (!from) throw new Error("INFOBIP_WA_SENDER not set");

  const url = `https://${baseUrl}/whatsapp/1/message/text`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `App ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ from, to, content: { text: body } }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Infobip WhatsApp ${res.status}: ${err.slice(0, 200)}`);
  }
}

// ─── Twilio ───────────────────────────────────────────────────────────────────
// Direct REST API calls — no SDK dependency.
// Required env vars:
//   TWILIO_ACCOUNT_SID  → Account SID (AC...)
//   TWILIO_AUTH_TOKEN   → Auth Token
// Optional:
//   TWILIO_WA_FROM      → WhatsApp sender (default: Twilio sandbox +14155238886)

function twilioAuthHeader(): string {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken  = process.env.TWILIO_AUTH_TOKEN!;
  return "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
}

function twilioConfigured(): boolean {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  return !!(accountSid?.startsWith("AC") && authToken);
}

async function twilioPost(path: string, params: Record<string, string>): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: twilioAuthHeader(),
    },
    body: new URLSearchParams(params).toString(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as any;
    throw new Error(
      `Twilio ${res.status}: ${data?.message ?? res.statusText}` +
      (data?.code ? ` (code ${data.code})` : "")
    );
  }
}

async function sendTwilioWhatsapp(to: string, body: string): Promise<void> {
  const rawFrom = process.env.TWILIO_WA_FROM || "+14155238886";
  const from    = rawFrom.startsWith("whatsapp:") ? rawFrom : `whatsapp:${rawFrom}`;
  const toWa    = to.startsWith("whatsapp:")     ? to       : `whatsapp:${to}`;

  await twilioPost("Messages.json", { To: toWa, From: from, Body: body });
}

// ─── Twilio Verify Service ────────────────────────────────────────────────────
// Preferred phone OTP path. Twilio manages code generation, storage, expiry,
// rate-limiting and multi-channel delivery. No DB row needed.
function twilioVerifyConfigured(): boolean {
  return !!(
    process.env.TWILIO_VERIFY_SID?.startsWith("VA") &&
    process.env.TWILIO_ACCOUNT_SID?.startsWith("AC") &&
    process.env.TWILIO_AUTH_TOKEN
  );
}

export async function sendTwilioVerify(to: string, channel: "whatsapp" | "sms" = "whatsapp"): Promise<void> {
  const sid = process.env.TWILIO_VERIFY_SID!;
  const url = `https://verify.twilio.com/v2/Services/${sid}/Verifications`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: twilioAuthHeader(),
    },
    body: new URLSearchParams({ To: to, Channel: channel }).toString(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as any;
    throw new Error(
      `Twilio Verify send ${res.status}: ${data?.message ?? res.statusText}` +
      (data?.code ? ` (code ${data.code})` : "")
    );
  }
}

export async function checkTwilioVerify(to: string, code: string): Promise<"approved" | "pending" | "expired"> {
  const sid = process.env.TWILIO_VERIFY_SID!;
  const url = `https://verify.twilio.com/v2/Services/${sid}/VerificationChecks`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: twilioAuthHeader(),
    },
    body: new URLSearchParams({ To: to, Code: code }).toString(),
  });
  const data = await res.json().catch(() => ({})) as any;
  if (!res.ok) {
    // 404 means the verification was not found / already used / expired
    if (res.status === 404) return "expired";
    throw new Error(
      `Twilio Verify check ${res.status}: ${data?.message ?? res.statusText}` +
      (data?.code ? ` (code ${data.code})` : "")
    );
  }
  return data?.status === "approved" ? "approved" : "pending";
}

export { twilioVerifyConfigured };

// ─── Resend (email OTP) ───────────────────────────────────────────────────────
// RESEND_EMAIL_FROM is accepted as an alias for RESEND_FROM_EMAIL.
function getResendApiKey(): string | undefined {
  return process.env.RESEND_API_KEY;
}
function getResendFromEmail(): string | undefined {
  return process.env.RESEND_FROM_EMAIL || process.env.RESEND_EMAIL_FROM;
}
function resendConfigured(): boolean {
  return !!(getResendApiKey() && getResendFromEmail());
}

async function sendResendEmail(to: string, otp: string, fullBody: string): Promise<void> {
  const apiKey = getResendApiKey()!;
  const from = getResendFromEmail()!;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Votre code de vérification Jatek",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
          <h2 style="color:#E91E63;margin:0 0 8px">Jatek</h2>
          <p style="color:#374151;margin:0 0 24px">Voici votre code de vérification :</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#0A1B3D;
                      background:#F3F4F6;border-radius:8px;padding:16px 24px;
                      text-align:center;margin:0 0 24px">${otp}</div>
          <p style="color:#6B7280;font-size:13px;margin:0">
            Ce code est valable 5 minutes.<br>Ne le communiquez à personne.
          </p>
        </div>`,
      text: fullBody,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend ${res.status}: ${err.slice(0, 300)}`);
  }
}

// ─── Public: email OTP ────────────────────────────────────────────────────────
export async function sendOtpEmail(
  email: string,
  otp: string,
  body: string
): Promise<SendOtpResult> {
  const attempts: AttemptLog[] = [];

  if (!resendConfigured()) {
    attempts.push({ channel: "resend-email", ok: false, reason: "not configured" });
    const summary = attempts.map((a) => `${a.channel}=${a.reason}`).join(" | ");
    throw new Error(`Email OTP provider not configured: ${summary}`);
  }

  try {
    await sendResendEmail(email, otp, body);
    attempts.push({ channel: "resend-email", ok: true });
    console.info(`[OTP] sent via resend-email to ${email}`);
    return { channel: "resend-email", attempts };
  } catch (err: any) {
    const reason = err?.message ?? String(err);
    attempts.push({ channel: "resend-email", ok: false, reason });
    console.warn(`[OTP] resend-email failed for ${email}: ${reason}`);
    const summary = attempts.map((a) => `${a.channel}=${a.ok ? "ok" : a.reason}`).join(" | ");
    throw new Error(`Email OTP delivery failed: ${summary}`);
  }
}

// ─── Public: WhatsApp OTP ─────────────────────────────────────────────────────
// Phone OTP is WhatsApp-only. Provider failure is surfaced instead of sending SMS.
export async function sendOtpMessage(
  to: string,
  body: string
): Promise<SendOtpResult> {
  const attempts: AttemptLog[] = [];
  const infobipReady = infobipConfigured();
  const twilioReady = await twilioConfigured();

  type Step = { channel: OtpChannel; available: boolean; fn: () => Promise<void> };
  const steps: Step[] = [
    // ── Twilio WhatsApp (primary) ────────────────────────────────────────────
    {
      channel: "twilio-whatsapp",
      available: twilioReady,
      fn: () => sendTwilioWhatsapp(to, body),
    },
    // ── Infobip WhatsApp (fallback) ──────────────────────────────────────────
    {
      channel: "infobip-whatsapp",
      available: infobipReady && !!process.env.INFOBIP_WA_SENDER,
      fn: () => sendInfobipWhatsapp(to, body),
    },
  ];

  for (const step of steps) {
    if (!step.available) {
      attempts.push({ channel: step.channel, ok: false, reason: "not configured" });
      continue;
    }
    try {
      await step.fn();
      attempts.push({ channel: step.channel, ok: true });
      console.info(`[OTP] sent via ${step.channel} to ${to}`);
      return { channel: step.channel, attempts };
    } catch (err: any) {
      const reason = err?.message ?? String(err);
      attempts.push({ channel: step.channel, ok: false, reason });
      console.warn(`[OTP] ${step.channel} failed for ${to}: ${reason}`);
    }
  }

  const summary = attempts
    .map((a) => `${a.channel}=${a.ok ? "ok" : a.reason}`)
    .join(" | ");
  throw new Error(`All OTP providers failed: ${summary}`);
}

export async function anyOtpProviderConfigured(): Promise<boolean> {
  if (infobipConfigured()) return true;
  if (resendConfigured()) return true;
  return await twilioConfigured();
}

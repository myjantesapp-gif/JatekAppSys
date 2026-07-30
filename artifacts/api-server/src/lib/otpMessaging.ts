// OTP messaging with multi-provider fallback chain.
//
// SMS/WhatsApp order:
//   1. Twilio WhatsApp   (primary — env: TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WA_FROM)
//   2. Twilio SMS        (env: TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER)
//   3. Infobip WhatsApp  (fallback — env: INFOBIP_API_KEY + INFOBIP_BASE_URL + INFOBIP_WA_SENDER)
//   4. Infobip SMS       (fallback — env: INFOBIP_API_KEY + INFOBIP_BASE_URL)
//
// Email: Resend (RESEND_API_KEY + RESEND_FROM_EMAIL)
//
// Each provider is skipped silently when not configured. The first successful
// send wins; failures are logged and the chain continues. If every provider
// fails, throws an aggregated error.
//
// Twilio calls use the REST API directly (fetch) — no SDK dependency.

export type OtpChannel =
  | "infobip-whatsapp"
  | "infobip-sms"
  | "twilio-whatsapp"
  | "twilio-sms"
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

async function sendInfobipSms(to: string, body: string): Promise<void> {
  const apiKey = process.env.INFOBIP_API_KEY!;
  const baseUrl = infobipBaseHost()!;
  const sender = process.env.INFOBIP_SENDER || "Jatek";
  const url = `https://${baseUrl}/sms/2/text/advanced`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `App ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      messages: [{ from: sender, destinations: [{ to }], text: body }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Infobip SMS ${res.status}: ${err.slice(0, 200)}`);
  }
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
//   TWILIO_FROM_NUMBER  → Sender phone number
// Optional:
//   TWILIO_WA_FROM              → WhatsApp sender (default: Twilio sandbox +14155238886)
//   TWILIO_MESSAGING_SERVICE_SID → Messaging Service SID (overrides FROM number for SMS)

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

async function sendTwilioSms(to: string, body: string): Promise<void> {
  const from               = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!from && !messagingServiceSid) {
    throw new Error("Twilio SMS sender not configured (set TWILIO_FROM_NUMBER)");
  }

  const params: Record<string, string> = { To: to, Body: body };
  if (messagingServiceSid) {
    params.MessagingServiceSid = messagingServiceSid;
  } else {
    params.From = from!;
  }

  await twilioPost("Messages.json", params);
}

async function sendTwilioWhatsapp(to: string, body: string): Promise<void> {
  const rawFrom = process.env.TWILIO_WA_FROM || "+14155238886";
  const from    = rawFrom.startsWith("whatsapp:") ? rawFrom : `whatsapp:${rawFrom}`;
  const toWa    = to.startsWith("whatsapp:")     ? to       : `whatsapp:${to}`;

  await twilioPost("Messages.json", { To: toWa, From: from, Body: body });
}

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

// ─── Public: WhatsApp/SMS OTP ─────────────────────────────────────────────────
// WhatsApp is tried first (preferred channel), SMS is fallback.
export async function sendOtpMessage(
  to: string,
  body: string
): Promise<SendOtpResult> {
  const attempts: AttemptLog[] = [];
  const infobipReady = infobipConfigured();
  const twilioReady = await twilioConfigured();

  type Step = { channel: OtpChannel; available: boolean; fn: () => Promise<void> };
  const steps: Step[] = [
    // ── Twilio (primary) ────────────────────────────────────────────────────
    {
      channel: "twilio-whatsapp",
      available: twilioReady,
      fn: () => sendTwilioWhatsapp(to, body),
    },
    {
      channel: "twilio-sms",
      available: twilioReady,
      fn: () => sendTwilioSms(to, body),
    },
    // ── Infobip (fallback) ──────────────────────────────────────────────────
    {
      channel: "infobip-whatsapp",
      available: infobipReady && !!process.env.INFOBIP_WA_SENDER,
      fn: () => sendInfobipWhatsapp(to, body),
    },
    {
      channel: "infobip-sms",
      available: infobipReady,
      fn: () => sendInfobipSms(to, body),
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

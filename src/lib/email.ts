import "server-only";
import nodemailer from "nodemailer";
import { Resend } from "resend";

// Emails CareFolio sends: login codes and account links.
//
// Two ways to send (server-only secrets, never NEXT_PUBLIC_):
//   1. Gmail — GMAIL_USER plus EITHER an App Password (GMAIL_APP_PASSWORD)
//      OR Google OAuth (GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET +
//      GMAIL_REFRESH_TOKEN, scope https://mail.google.com/). Free, reaches
//      ANY inbox (about 500 a day).
//   2. Resend — RESEND_API_KEY + RESEND_FROM_EMAIL. While the sender is
//      on resend.dev, Resend only delivers to the Resend account owner's
//      own inbox; it needs a verified domain to reach everyone.
// EMAIL_PROVIDER ("gmail" or "resend") forces one. Without it: Gmail if
// its two settings exist, otherwise Resend.

/** `key` makes a retried send a no-op (Resend idempotency, 24 h). */
type Sender = (to: string, subject: string, html: string, text: string, key?: string) => Promise<SentResult>;

let sendVia: Sender | null = null;

function pickSender(): Sender {
  const forced = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (forced && forced !== "gmail" && forced !== "resend") {
    throw new Error(`EMAIL_PROVIDER must be "gmail" or "resend" (got "${forced}").`);
  }
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const gmailOAuth = Boolean(clientId && clientSecret && refreshToken);
  const gmailReady = Boolean(gmailUser && (gmailOAuth || gmailPass));
  if (forced === "gmail" && !gmailReady) {
    throw new Error(
      "EMAIL_PROVIDER is gmail, but GMAIL_USER plus GMAIL_APP_PASSWORD (or GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN) is missing.",
    );
  }
  if (forced === "gmail" || (!forced && gmailReady)) {
    console.info(`[email] using provider: gmail (${gmailOAuth ? "oauth" : "app password"})`);
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      // OAuth: nodemailer swaps the refresh token for a short-lived
      // access token by itself.
      auth: gmailOAuth
        ? { type: "OAuth2", user: gmailUser!, clientId, clientSecret, refreshToken }
        : { user: gmailUser!, pass: gmailPass! },
    });
    return async (to, subject, html, text) => {
      try {
        await transport.sendMail({ from: `CareFolio <${gmailUser}>`, to, subject, html, text });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: `Gmail: ${e instanceof Error ? e.message : String(e)}` };
      }
    };
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) {
    throw new Error(
      forced === "resend"
        ? "EMAIL_PROVIDER is resend, but RESEND_API_KEY or RESEND_FROM_EMAIL is missing."
        : "No email sender configured: set GMAIL_USER + GMAIL_APP_PASSWORD (or RESEND_API_KEY + RESEND_FROM_EMAIL).",
    );
  }
  console.info("[email] using provider: resend");
  const resend = new Resend(key);
  const sender = from.includes("<") ? from : `CareFolio <${from}>`;
  return async (to, subject, html, text, key) => {
    const { error } = await resend.emails.send({
      from: sender,
      to: [to],
      subject,
      html,
      text,
      // Supabase may retry the hook; the same key never sends twice.
      ...(key ? { idempotencyKey: key } : {}),
    });
    return error ? { ok: false, error: `Resend: ${error.name}: ${error.message}` } : { ok: true };
  };
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Email clients ignore CSS files and variables, so the brand colours
// (teal #0B6E69, ink #10292C, muted #4B6164) are written inline here.
function layout(title: string, inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#F3F6F5;font-family:Arial,Helvetica,sans-serif;color:#10292C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#FFFFFF;border:1px solid #D4DFDD;border-radius:16px">
<tr><td style="padding:28px 28px 8px;font-size:20px;font-weight:800">carefolio</td></tr>
<tr><td style="padding:8px 28px 28px">
<h1 style="margin:0 0 12px;font-size:22px">${escape(title)}</h1>
${inner}
<p style="margin:24px 0 0;font-size:12px;color:#4B6164">Never share this email. CareFolio staff will never ask for your code.
If you didn't try to sign in, you can ignore it — your account is safe.</p>
</td></tr></table>
</td></tr></table></body></html>`;
}

export type SentResult = { ok: true } | { ok: false; error: string };

function deliver(to: string, subject: string, html: string, text: string, key?: string): Promise<SentResult> {
  sendVia ??= pickSender();
  return sendVia(to, subject, html, text, key);
}

/** The 6-digit login / sign-up code. */
export function sendCodeEmail(to: string, code: string, key?: string) {
  const digits = code.split("").join(" ");
  return deliver(
    to,
    `Your CareFolio code: ${code}`,
    layout(
      "Your login code",
      `<p style="margin:0 0 16px;font-size:15px;color:#4B6164">Enter this code in CareFolio to finish logging in.</p>
<p style="margin:0;padding:16px;border-radius:12px;background:#E3F1EF;text-align:center;font-size:32px;font-weight:800;letter-spacing:6px;color:#0B4A46">${escape(digits)}</p>`,
    ),
    `Your CareFolio login code is ${code}. Never share it. If you didn't try to sign in, ignore this email.`,
    key,
  );
}

/** A link email (password reset, email change, …). */
export function sendLinkEmail(
  to: string,
  subject: string,
  title: string,
  intro: string,
  url: string,
  button: string,
  key?: string,
) {
  return deliver(
    to,
    subject,
    layout(
      title,
      `<p style="margin:0 0 16px;font-size:15px;color:#4B6164">${escape(intro)}</p>
<p style="margin:0"><a href="${escape(url)}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#0B6E69;color:#FFFFFF;font-weight:700;text-decoration:none">${escape(button)}</a></p>`,
    ),
    `${intro}\n\n${url}`,
    key,
  );
}

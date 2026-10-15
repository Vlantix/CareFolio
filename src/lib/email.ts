import "server-only";
import { Resend } from "resend";

// Emails CareFolio sends through Resend (the team's email vendor).
// Server-only: RESEND_API_KEY is a secret and never a NEXT_PUBLIC_ variable.
//
// NOTE: while RESEND_FROM_EMAIL is on Resend's test domain (…@resend.dev),
// Resend only delivers to the email address that owns the Resend account.
// To email anyone else, verify your own domain in Resend → Domains.

let client: Resend | null = null;
function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is missing (add it to .env.local and Vercel).");
  client ??= new Resend(key);
  return client;
}

function sender() {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("RESEND_FROM_EMAIL is missing (add it to .env.local and Vercel).");
  return from.includes("<") ? from : `CareFolio <${from}>`;
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

async function deliver(to: string, subject: string, html: string, text: string): Promise<SentResult> {
  const { error } = await resend().emails.send({ from: sender(), to, subject, html, text });
  if (error) return { ok: false, error: `${error.name}: ${error.message}` };
  return { ok: true };
}

/** The 6-digit login / sign-up code. */
export function sendCodeEmail(to: string, code: string) {
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
  );
}

/** A link email (password reset, email change, …). */
export function sendLinkEmail(to: string, subject: string, title: string, intro: string, url: string, button: string) {
  return deliver(
    to,
    subject,
    layout(
      title,
      `<p style="margin:0 0 16px;font-size:15px;color:#4B6164">${escape(intro)}</p>
<p style="margin:0"><a href="${escape(url)}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#0B6E69;color:#FFFFFF;font-weight:700;text-decoration:none">${escape(button)}</a></p>`,
    ),
    `${intro}\n\n${url}`,
  );
}

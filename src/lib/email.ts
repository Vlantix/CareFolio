import "server-only";

// Emails CareFolio sends: login codes and account links — all through
// the Gmail API (Google OAuth), from the team Gmail GMAIL_USER.
//
// Settings (server-only secrets, never NEXT_PUBLIC_):
//   GMAIL_USER            the Gmail address that sends
//   GOOGLE_CLIENT_ID      Google Cloud → Credentials → OAuth client
//   GOOGLE_CLIENT_SECRET  …same place
//   GOOGLE_REFRESH_TOKEN  from signing in once as GMAIL_USER, with scope
//                         https://www.googleapis.com/auth/gmail.send
//                         (or https://mail.google.com/) — see README.
// All three GOOGLE_* values must come from the SAME OAuth client, or
// Google answers "unauthorized_client". Check them with npm run check:gmail.
//
// Two plain HTTPS calls, no extra library: swap the refresh token for a
// short-lived access token, then ask Gmail to send the message.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

const SETTINGS = ["GMAIL_USER", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"] as const;

function settings() {
  // Trimmed: a stray space or newline pasted into Vercel breaks the token.
  const [user, clientId, clientSecret, refreshToken] = SETTINGS.map(
    (name) => process.env[name]?.trim() ?? "",
  );
  const missing = SETTINGS.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    // Names only — never the values.
    throw new Error(`Gmail API not configured: missing ${missing.join(", ")}.`);
  }
  return { user, clientId, clientSecret, refreshToken };
}

// The access token lasts about an hour; reuse it until shortly before then.
let cachedToken: { value: string; expiresAt: number } | null = null;
let loggedOnce = false;

async function accessToken(s: ReturnType<typeof settings>): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: s.clientId,
      client_secret: s.clientSecret,
      refresh_token: s.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    // Status plus Google's own error fields (never our secrets), e.g.
    // 401 unauthorized_client (token from a different client), 400
    // invalid_grant (token expired or revoked), 401 invalid_client (wrong ID/secret).
    throw new Error(
      `token: ${res.status} ${data.error ?? "no_error_field"}${data.error_description ? `: ${data.error_description}` : ""}`,
    );
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000 };
  return data.access_token;
}

const b64 = (s: string) => Buffer.from(s, "utf-8").toString("base64");

/** A plain-text + HTML email in the raw format Gmail expects. */
function mime(from: string, to: string, subject: string, html: string, text: string) {
  const boundary = `cf_${crypto.randomUUID()}`;
  return [
    `From: CareFolio <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function deliver(to: string, subject: string, html: string, text: string): Promise<SentResult> {
  const s = settings(); // throws a clear error if a setting is missing
  if (!loggedOnce) {
    console.info("[email] using provider: gmail api");
    loggedOnce = true;
  }
  if (/[\r\n]/.test(to)) return { ok: false, error: "Gmail API: bad recipient" };
  try {
    const token = await accessToken(s);
    const raw = Buffer.from(mime(s.user, to, subject, html, text), "utf-8").toString("base64url");
    const res = await fetch(SEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      if (res.status === 401) cachedToken = null;
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      return { ok: false, error: `Gmail API: ${res.status}: ${data.error?.message ?? res.statusText}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Gmail API: ${e instanceof Error ? e.message : String(e)}` };
  }
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
export function sendLinkEmail(
  to: string,
  subject: string,
  title: string,
  intro: string,
  url: string,
  button: string,
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
  );
}

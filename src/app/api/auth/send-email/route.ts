import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sendCodeEmail, sendLinkEmail } from "@/lib/email";

// Supabase "Send Email Hook" (optional): instead of sending auth emails
// itself, Supabase calls this address with the link details and we send
// the email ourselves — through the Gmail API (src/lib/email.ts).
// Login codes do NOT come through here any more: CareFolio makes and
// sends those itself (src/app/verify/actions.ts). This is for
// password-reset (and email-change) links.
//
// Set up in Supabase → Authentication → Hooks → Send Email (HTTPS):
//   URL:    https://<your site>/api/auth/send-email
//   Secret: copy it into SEND_EMAIL_HOOK_SECRET (Vercel + .env.local)
//
// Only Supabase can call this: every request must carry a valid
// signature made with that secret ("Standard Webhooks" format).

type HookPayload = {
  user: { email: string; new_email?: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

const FIVE_MINUTES = 5 * 60;

/** Standard Webhooks signature check (what Supabase uses). */
function verifySignature(body: string, headers: Headers) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!secret || !id || !timestamp || !signatures) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > FIVE_MINUTES) return false;

  // Supabase shows the secret as "v1,whsec_<base64>".
  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signatures.split(" ").some((part) => {
    const [, sig] = part.split(",");
    if (!sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

function hookError(status: number, message: string) {
  // Supabase shows this message as the reason the email failed.
  return NextResponse.json({ error: { http_code: status, message } }, { status });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!verifySignature(body, request.headers)) return hookError(401, "Invalid signature");

  let payload: HookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return hookError(400, "Bad payload");
  }
  const { user, email_data: data } = payload;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Link emails go through Supabase's verify step, then on to redirect_to.
  const verifyLink = (hash: string, type: string) =>
    `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(hash)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(data.redirect_to || data.site_url)}`;

  let result;
  try {
    switch (data.email_action_type) {
      // Not used by our login any more, kept in case Supabase sends one.
      case "magiclink":
      case "signup":
      case "reauthentication":
        result = await sendCodeEmail(user.email, data.token);
        break;
      case "recovery":
        result = await sendLinkEmail(
          user.email,
          "Reset your CareFolio password",
          "Reset your password",
          "Someone asked to reset your CareFolio password. If it was you, choose a new one:",
          verifyLink(data.token_hash, "recovery"),
          "Choose a new password",
        );
        break;
      case "email_change":
        result = await sendLinkEmail(
          user.new_email ?? user.email,
          "Confirm your new CareFolio email",
          "Confirm your new email",
          "Confirm this is your new email address for CareFolio:",
          verifyLink(data.token_hash_new || data.token_hash, "email_change"),
          "Confirm email",
        );
        break;
      default:
        result = await sendLinkEmail(
          user.email,
          "CareFolio",
          "Continue to CareFolio",
          "Use this link to continue:",
          verifyLink(data.token_hash, data.email_action_type),
          "Continue",
        );
    }
  } catch (e) {
    console.error("send-email hook:", e);
    return hookError(500, e instanceof Error ? e.message : "Email failed");
  }

  if (!result.ok) {
    // Shows up in Vercel → Logs, e.g. an expired Gmail refresh token.
    console.error("send-email hook: email refused:", result.error);
    return hookError(502, result.error);
  }
  return NextResponse.json({});
}

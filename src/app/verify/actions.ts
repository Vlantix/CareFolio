"use server";

import { createHash, randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  MFA_COOKIE,
  PORTAL_COOKIE,
  createMfaToken,
  mfaCookieOptions,
} from "@/lib/mfa";
import { otpSchema } from "@/lib/validation";
import { deviceLabel, phTime, waitText } from "@/lib/device";
import { currentLogin } from "@/lib/login";
import { sendCodeEmail, type SentResult } from "@/lib/email";

export type SendState = { sent?: boolean; error?: string; waitSeconds?: number };

/** Locked out after too many wrong codes? Returns a message, or null. */
async function lockMessage(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: lockedUntil } = await supabase.rpc("otp_locked_until");
  if (!lockedUntil) return null;
  return `Too many wrong codes. You can try again at ${phTime(lockedUntil)}.`;
}

/**
 * The code is checked by its hash, tied to this exact login (session):
 * sha256("<session id>:<code>"). The code itself is never stored.
 */
function hashCode(sessionId: string, code: string) {
  return createHash("sha256").update(`${sessionId}:${code}`).digest("hex");
}

/**
 * Emails a 6-digit code to the logged-in user, within the send limits.
 * CareFolio makes the code and sends it itself through Resend
 * (src/lib/email.ts) — Supabase isn't involved in sending it.
 */
export async function sendCode(): Promise<SendState> {
  const login = await currentLogin();
  // No recent password login (e.g. a device logged out from the Devices
  // page): never email the owner a code — send them to log in instead.
  if (!login || !login.passwordRecently || !login.sessionId) redirect("/login?notice=expired");

  // A random 6-digit code from a secure random source.
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  // Stores only the hash, after the limits (1 a minute, 5 an hour) and
  // the lockout check — all in the database.
  const codeHash = hashCode(login.sessionId, code);
  const { data: wait, error: issueError } = await login.supabase.rpc("issue_login_code", {
    p_code_hash: codeHash,
  });
  if (issueError) {
    console.error("sendCode: issue_login_code failed:", issueError.code, issueError.message);
    return { error: "We couldn't send the code. Please try again in a minute." };
  }
  if (wait === -1) {
    return (await lockMessage(login.supabase).then((m) => (m ? { error: m } : null))) ??
      { error: "Too many wrong codes. Please try again later." };
  }
  if (wait > 0) {
    return {
      error: `To keep your account safe, codes are limited. You can ask for a new one in ${waitText(wait)}.`,
      waitSeconds: wait,
    };
  }

  let sent: SentResult;
  try {
    sent = await sendCodeEmail(login.email, code, `login-code/${login.sessionId}/${Date.now()}`);
  } catch (e) {
    // e.g. no email provider configured on this deployment.
    sent = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  if (!sent.ok) {
    // The exact reason (e.g. Resend's "testing emails to your own email
    // address") is in Vercel → Logs. Only the domain — never the full
    // address, never the code.
    console.error("[otp] email failed:", sent.error, "| to domain:", login.email.split("@")[1]);
    // The code never arrived: switch it off and give the send back, so
    // the person isn't blocked by the limits (supabase/sql/014).
    const { error: discardError } = await login.supabase.rpc("discard_login_code", {
      p_code_hash: codeHash,
    });
    if (discardError) console.error("[otp] discard failed:", discardError.code, discardError.message);
    return { error: "We couldn't send your code. Please try again in a moment." };
  }
  return { sent: true };
}

export type VerifyState = { error?: string; lockedUntil?: string };

export async function verifyCode(_prev: VerifyState, form: FormData): Promise<VerifyState> {
  const parsed = otpSchema.safeParse(form.get("token"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const login = await currentLogin();
  if (!login || !login.passwordRecently || !login.sessionId) redirect("/login?notice=expired");
  const { supabase, userId } = login;

  // The database counts the attempt first (race-proof lockout), compares
  // hashes, and on success starts this device's session (with the "New
  // login" notice and the audit row).
  const device = deviceLabel((await headers()).get("user-agent"));
  const { data, error } = await supabase.rpc("verify_login_code", {
    p_code_hash: hashCode(login.sessionId, parsed.data),
    p_device_label: device,
  });
  if (error || !data) {
    console.error("verifyCode: verify_login_code failed:", error?.code, error?.message);
    return { error: "We couldn't check the code. Please try again." };
  }
  const result = data as { status: string; session_id?: string; locked_until?: string };
  if (result.status === "locked" && result.locked_until) {
    return {
      error: `Too many wrong codes. You can try again at ${phTime(result.locked_until)}.`,
      lockedUntil: result.locked_until,
    };
  }
  if (result.status === "expired") {
    return { error: "That code has expired. Send a new one." };
  }
  if (result.status !== "ok" || !result.session_id) {
    return { error: "That code is wrong. Check it, or send a new one." };
  }
  const sessionId = result.session_id;

  const cookieStore = await cookies();
  cookieStore.set(MFA_COOKIE, await createMfaToken(userId, sessionId), mfaCookieOptions);

  // Staff login (started on /admin/login): only real admins get through.
  if (cookieStore.get(PORTAL_COOKIE)?.value === "staff") {
    cookieStore.delete(PORTAL_COOKIE);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.role !== "admin") {
      // Same message as a wrong password: never confirm the portal exists.
      await supabase.rpc("revoke_session", { p_session_id: sessionId });
      await supabase.auth.signOut({ scope: "local" });
      cookieStore.delete(MFA_COOKIE);
      redirect("/admin/login?failed=1");
    }
    redirect("/loading");
  }

  // Everyone goes through the loading screen, which then sends them to
  // the guide, the terms, Home — or /admin for staff.
  redirect("/loading");
}

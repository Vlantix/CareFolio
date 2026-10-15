"use server";

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

// The code must follow a password login made in the last 30 minutes.
// Without this, someone with only access to the mailbox could ask
// Supabase for a code directly and skip the password entirely.
const PASSWORD_WINDOW_SECONDS = 30 * 60;

async function currentLogin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || !claims.email) return null;

  const now = Math.floor(Date.now() / 1000);
  const amr = (claims.amr ?? []) as Array<{ method: string; timestamp: number } | string>;
  const passwordRecently = amr.some(
    (entry) =>
      typeof entry === "object" &&
      entry.method === "password" &&
      now - entry.timestamp < PASSWORD_WINDOW_SECONDS,
  );
  return { supabase, userId: claims.sub, email: claims.email, passwordRecently };
}

export type SendState = { sent?: boolean; error?: string; waitSeconds?: number };

/** Locked out after too many wrong codes? Returns a message, or null. */
async function lockMessage(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: lockedUntil } = await supabase.rpc("otp_locked_until");
  if (!lockedUntil) return null;
  return `Too many wrong codes. You can try again at ${phTime(lockedUntil)}.`;
}

/** Emails a 6-digit code to the logged-in user, within the send limits. */
export async function sendCode(): Promise<SendState> {
  const login = await currentLogin();
  if (!login) return { error: "Your login has expired. Please log in again." };

  const locked = await lockMessage(login.supabase);
  if (locked) return { error: locked };

  // Our limits (1 a minute, 5 an hour), checked and recorded in the
  // database. The code itself is never stored or logged.
  const { data: wait, error: limitError } = await login.supabase.rpc("otp_send_check");
  if (limitError) return { error: "We couldn't send the code. Please try again in a minute." };
  if (wait > 0) {
    return {
      error: `To keep your account safe, codes are limited. You can ask for a new one in ${waitText(wait)}.`,
      waitSeconds: wait,
    };
  }

  const { error } = await login.supabase.auth.signInWithOtp({
    email: login.email,
    // Never create an account from this step — only existing users get codes.
    options: { shouldCreateUser: false },
  });
  if (error) {
    if (error.status === 429 || error.code?.includes("rate_limit")) {
      return { error: "A code was sent a moment ago. Wait a minute before asking for another.", waitSeconds: 60 };
    }
    return { error: "We couldn't send the code. Please try again in a minute." };
  }
  return { sent: true };
}

export type VerifyState = { error?: string; locked?: boolean };

export async function verifyCode(_prev: VerifyState, form: FormData): Promise<VerifyState> {
  const parsed = otpSchema.safeParse(form.get("token"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const login = await currentLogin();
  if (!login || !login.passwordRecently) redirect("/login?notice=expired");

  const { supabase, userId, email } = login;

  const locked = await lockMessage(supabase);
  if (locked) return { error: locked, locked: true };

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data,
    type: "email",
  });
  if (error || data.user?.id !== userId) {
    // Count it; the 5th wrong code within 15 minutes locks code entry.
    const { data: lockedUntil } = await supabase.rpc("otp_note_failed");
    if (lockedUntil) {
      return {
        error: `Too many wrong codes. You can try again at ${phTime(lockedUntil)}.`,
        locked: true,
      };
    }
    return { error: "That code is wrong or has expired. Check it, or send a new one." };
  }

  // Correct code: start this device's session (also posts the
  // "New login" notice and the audit row), then remember it in cf_mfa.
  const device = deviceLabel((await headers()).get("user-agent"));
  const { data: sessionId, error: sessionError } = await supabase.rpc("start_session", {
    p_device_label: device,
  });
  if (sessionError || !sessionId) {
    return { error: "We couldn't finish logging you in. Please try again." };
  }

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
      await supabase.auth.signOut();
      cookieStore.delete(MFA_COOKIE);
      redirect("/admin/login?failed=1");
    }
    redirect("/admin");
  }

  // Staff who used the patient login go to the staff area; the proxy
  // sends first-time patients and caregivers on to /terms.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  redirect(profile?.role === "admin" ? "/admin" : "/home");
}

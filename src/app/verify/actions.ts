"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  MFA_COOKIE,
  PORTAL_COOKIE,
  createMfaToken,
  mfaCookieOptions,
} from "@/lib/mfa";
import { otpSchema } from "@/lib/validation";

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

export type SendState = { sent?: boolean; error?: string };

/** Emails a 6-digit code to the logged-in user. */
export async function sendCode(): Promise<SendState> {
  const login = await currentLogin();
  if (!login) return { error: "Your login has expired. Please log in again." };

  const { error } = await login.supabase.auth.signInWithOtp({
    email: login.email,
    // Never create an account from this step — only existing users get codes.
    options: { shouldCreateUser: false },
  });
  if (error) {
    if (error.status === 429 || error.code?.includes("rate_limit")) {
      return { error: "A code was sent a moment ago. Wait a minute before asking for another." };
    }
    return { error: "We couldn't send the code. Please try again in a minute." };
  }
  return { sent: true };
}

export type VerifyState = { error?: string };

export async function verifyCode(_prev: VerifyState, form: FormData): Promise<VerifyState> {
  const parsed = otpSchema.safeParse(form.get("token"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const login = await currentLogin();
  if (!login || !login.passwordRecently) redirect("/login?notice=expired");

  const { supabase, userId, email } = login;
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data,
    type: "email",
  });
  if (error || data.user?.id !== userId) {
    return { error: "That code is wrong or has expired. Check it, or send a new one." };
  }

  const cookieStore = await cookies();
  cookieStore.set(MFA_COOKIE, await createMfaToken(userId), mfaCookieOptions);

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

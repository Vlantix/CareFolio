"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { MFA_COOKIE } from "@/lib/mfa";
import { emailSchema, newPasswordSchema } from "@/lib/validation";

export type ResetState = { error?: string; sent?: boolean };
export type VerifyResetState = { error?: string };

/**
 * Step 1 — send a 6-digit code to the email address.
 *
 * Uses resetPasswordForEmail, which triggers the Send Email Hook
 * (src/app/api/auth/send-email/route.ts). The hook's "recovery" case
 * now sends the raw OTP token as a code via Gmail API (same path as
 * login codes) rather than building a link.
 *
 * signInWithOtp is NOT used because it hits a different Supabase auth
 * code path that requires a hook authorization token not present in
 * our project.
 */
export async function requestReset(_prev: ResetState, form: FormData): Promise<ResetState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    console.error("requestReset: resetPasswordForEmail error:", error.code, error.message);
  }

  // Same response whether or not the email has an account (prevent enumeration).
  return { sent: true };
}

/**
 * Step 2 — check the 6-digit code the user entered.
 *
 * The email is carried as a hidden field (set by the client form when
 * the code was requested). type: 'recovery' matches what
 * resetPasswordForEmail generates. On success, Supabase sets a session
 * with AMR "recovery"; we redirect back to this page and the server
 * component detects the session and shows step 3.
 */
export async function verifyResetCode(
  _prev: VerifyResetState,
  form: FormData,
): Promise<VerifyResetState> {
  const email = String(form.get("email") ?? "").trim();
  const code = String(form.get("code") ?? "").trim();

  if (!email) return { error: "Session expired. Please start over." };
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code from your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
  if (error) {
    console.error("verifyResetCode: verifyOtp error:", error.code, error.status, error.message);
    if (error.status === 403 || error.code === "otp_expired") {
      return { error: "That code has expired. Request a new one." };
    }
    return { error: "That code is wrong. Double-check it and try again." };
  }

  // Session is now set with AMR "recovery". The page server component
  // detects it and renders the new-password form.
  redirect("/reset-password");
}

export type ResetAllState = { error?: string };

/**
 * Combined step 2+3 — verify the 6-digit code and set the new password in
 * one submission. Replaces the two-step verify → redirect → set flow shown
 * in the separate forms.
 */
export async function verifyAndSetPassword(
  _prev: ResetAllState,
  form: FormData,
): Promise<ResetAllState> {
  const email = String(form.get("email") ?? "").trim();
  const code = String(form.get("code") ?? "").trim();
  const parsed = newPasswordSchema.safeParse(form.get("password"));

  if (!email) return { error: "Session expired. Please start over." };
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code from your email." };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  const { error: otpError } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "recovery",
  });
  if (otpError) {
    console.error("verifyAndSetPassword: verifyOtp:", otpError.code, otpError.status);
    if (otpError.status === 403 || otpError.code === "otp_expired") {
      return { error: "That code has expired. Request a new one." };
    }
    return { error: "That code is wrong. Double-check it and try again." };
  }

  const { error: pwError } = await supabase.auth.updateUser({ password: parsed.data });
  if (pwError) {
    return {
      error:
        pwError.code === "same_password"
          ? "Choose a password different from your old one."
          : "Something went wrong. Please start over.",
    };
  }

  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(MFA_COOKIE);
  redirect("/login?notice=reset");
}

/** Step 3 — save the new password. */
export async function setNewPassword(_prev: ResetState, form: FormData): Promise<ResetState> {
  const parsed = newPasswordSchema.safeParse(form.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  // Server actions can be called directly — the page hiding the form
  // is not enough. Only a recovery session may change the password.
  const { data } = await supabase.auth.getClaims();
  if (!isRecoverySession(data?.claims?.amr)) {
    return { error: "Open the reset code from your email first." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "Choose a password different from your old one."
          : "Something went wrong. Please start over.",
    };
  }

  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(MFA_COOKIE);
  redirect("/login?notice=reset");
}

/** True when this session came from resetPasswordForEmail (AMR "recovery"). */
function isRecoverySession(amr: unknown) {
  return (
    Array.isArray(amr) &&
    amr.some(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "method" in e &&
        (e as { method: string }).method === "recovery",
    )
  );
}

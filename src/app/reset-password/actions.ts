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
 * Uses Supabase signInWithOtp which triggers the Send Email Hook
 * (src/app/api/auth/send-email/route.ts). The hook for the
 * "magiclink" action type sends the raw OTP code via Gmail API,
 * same as login codes. shouldCreateUser: false means the OTP is
 * never sent if the email has no account.
 */
export async function requestReset(_prev: ResetState, form: FormData): Promise<ResetState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: false },
  });

  if (error && error.code !== "user_not_found") {
    console.error("requestReset: signInWithOtp error:", error.code, error.message);
  }

  // Same response whether or not the email has an account (prevent enumeration).
  return { sent: true };
}

/**
 * Step 2 — check the 6-digit code the user entered.
 *
 * The email is carried as a hidden field (set by the client form
 * when the code was requested). On success, Supabase sets a
 * session with AMR method "otp"; we redirect back to this page and
 * the server component detects the session and shows step 3.
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
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) {
    console.error("verifyResetCode: verifyOtp error:", error.code, error.status, error.message);
    if (error.status === 403 || error.code === "otp_expired") {
      return { error: "That code has expired. Request a new one." };
    }
    return { error: "That code is wrong. Double-check it and try again." };
  }

  // Session is set. The page server component will detect the "otp" AMR
  // and render the new-password form.
  redirect("/reset-password");
}

/** Step 3 — save the new password. */
export async function setNewPassword(_prev: ResetState, form: FormData): Promise<ResetState> {
  const parsed = newPasswordSchema.safeParse(form.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  // Server actions can be called directly — the page hiding the form is not
  // enough protection. Check that this session came from a reset flow.
  const { data } = await supabase.auth.getClaims();
  if (!isResetSession(data?.claims?.amr)) {
    return { error: "Open the reset code email first." };
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

/**
 * True when this Supabase session was created by a password-reset
 * flow — either the new OTP path (AMR "otp") or the old magic-link
 * path (AMR "recovery"). Regular logins have AMR "password" and
 * must NOT be able to set a new password here.
 */
function isResetSession(amr: unknown) {
  return (
    Array.isArray(amr) &&
    amr.some(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "method" in e &&
        ["recovery", "otp"].includes((e as { method: string }).method),
    )
  );
}

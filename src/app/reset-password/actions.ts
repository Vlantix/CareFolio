"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MFA_COOKIE } from "@/lib/mfa";
import { emailSchema, newPasswordSchema } from "@/lib/validation";

export type ResetState = { error?: string; sent?: boolean };

/** Step 1: email a reset link. */
export async function requestReset(_prev: ResetState, form: FormData): Promise<ResetState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  // Same answer whether or not the email has an account.
  return { sent: true };
}

/** Step 2: after clicking the emailed link, choose a new password. */
export async function setNewPassword(_prev: ResetState, form: FormData): Promise<ResetState> {
  const parsed = newPasswordSchema.safeParse(form.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "Choose a password different from your old one."
          : "That reset link has expired. Ask for a new one.",
    };
  }

  // Log in again with the new password (and a fresh email code).
  await supabase.auth.signOut();
  (await cookies()).delete(MFA_COOKIE);
  redirect("/login?notice=reset");
}

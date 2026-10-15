"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MFA_COOKIE, PORTAL_COOKIE, portalCookieOptions } from "@/lib/mfa";
import { formToObject, loginSchema } from "@/lib/validation";

export type StaffLoginState = { error?: string; email?: string };

const GENERIC = "Invalid email or password.";

export async function staffLogin(
  _prev: StaffLoginState,
  form: FormData,
): Promise<StaffLoginState> {
  const parsed = loginSchema.safeParse(formToObject(form));
  const email = String(form.get("email") ?? "");
  if (!parsed.success) return { error: GENERIC, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: GENERIC, email };

  // The role is checked only AFTER the email code (see verify/actions.ts),
  // so this step behaves the same for everyone.
  const cookieStore = await cookies();
  cookieStore.delete(MFA_COOKIE);
  cookieStore.set(PORTAL_COOKIE, "staff", portalCookieOptions);
  redirect("/verify");
}

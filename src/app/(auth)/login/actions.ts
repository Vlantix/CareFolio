"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MFA_COOKIE, PORTAL_COOKIE } from "@/lib/mfa";
import { formToObject, loginSchema } from "@/lib/validation";

export type LoginState = { error?: string; email?: string };

// Same wording for every failure, so the form never reveals whether an
// email has an account.
const GENERIC = "Invalid email or password.";

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse(formToObject(form));
  const email = String(form.get("email") ?? "");
  if (!parsed.success) return { error: GENERIC, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: GENERIC, email };

  // Every login needs a fresh email code, so drop any earlier proof.
  const cookieStore = await cookies();
  cookieStore.delete(MFA_COOKIE);
  cookieStore.delete(PORTAL_COOKIE);
  redirect("/verify");
}

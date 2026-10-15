"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MFA_COOKIE, PORTAL_COOKIE } from "@/lib/mfa";

/** Ends the Supabase login AND forgets that the email code was passed. */
export async function logout(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(MFA_COOKIE);
  cookieStore.delete(PORTAL_COOKIE);
  redirect(formData.get("to") === "staff" ? "/admin/login" : "/login");
}

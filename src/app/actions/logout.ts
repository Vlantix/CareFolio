"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MFA_COOKIE, PORTAL_COOKIE, readMfaToken } from "@/lib/mfa";

/**
 * Ends the Supabase login, marks this device's session as logged out
 * (so it disappears from the Sessions page) and forgets the email-code
 * proof. Form fields: `to=staff` returns to the staff page;
 * `reason=idle` shows the "logged out after 15 minutes" notice.
 */
export async function logout(formData: FormData) {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (userId) {
    const sessionId = await readMfaToken(cookieStore.get(MFA_COOKIE)?.value, userId);
    if (sessionId) await supabase.rpc("revoke_session", { p_session_id: sessionId });
  }

  // "local": end THIS device's login only. (The default would end every
  // device's login while the Devices page still showed them as active.)
  await supabase.auth.signOut({ scope: "local" });
  cookieStore.delete(MFA_COOKIE);
  cookieStore.delete(PORTAL_COOKIE);

  const idle = formData.get("reason") === "idle";
  if (formData.get("to") === "staff") redirect(idle ? "/admin/login?idle=1" : "/admin/login");
  redirect(idle ? "/login?notice=idle" : "/login");
}

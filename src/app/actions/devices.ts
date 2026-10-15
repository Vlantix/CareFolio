"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireVerified } from "@/lib/auth";
import { logout } from "@/app/actions/logout";

// Shared by patients/caregivers and staff. Every database call below
// only ever touches the logged-in user's own rows (the functions check
// auth.uid() and a live device session), whatever the form sends.

function devicesPage(staff: boolean) {
  return staff ? "/admin/devices" : "/profile/sessions";
}

/** Log out one device. Logging out THIS device is a normal log out. */
export async function revokeDevice(form: FormData) {
  const { sessionId: current, staff } = await requireVerified();
  const target = String(form.get("sessionId") ?? "");
  if (!target) return;

  if (target === current) {
    const out = new FormData();
    if (staff) out.set("to", "staff");
    return logout(out);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_session", { p_session_id: target });
  if (error) redirect(`${devicesPage(staff)}?error=1`);
  revalidatePath(devicesPage(staff));
}

/** Log out every device except this one. */
export async function revokeOtherDevices() {
  const { sessionId: current, staff } = await requireVerified();
  if (!current) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_other_sessions", { p_keep: current });
  // Also end the other devices' Supabase logins, not just our sessions.
  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (error || signOutError) redirect(`${devicesPage(staff)}?error=1`);
  revalidatePath(devicesPage(staff));
}

/** Hide a notice. The database only marks the user's own. */
export async function dismissNotification(form: FormData) {
  const { staff } = await requireVerified();
  const id = String(form.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notification_read", { p_id: id });
  const home = staff ? "/admin" : "/home";
  if (error) redirect(`${home}?error=1`);
  revalidatePath(home);
}

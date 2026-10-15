"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthState, requireMember } from "@/lib/auth";
import { logout } from "@/app/actions/logout";

/** Log out one device. Logging out THIS device is a normal log out. */
export async function revokeDevice(form: FormData) {
  await requireMember();
  const { sessionId: current } = await getAuthState();
  const target = String(form.get("sessionId") ?? "");
  if (!target) return;

  if (target === current) return logout(new FormData());

  const supabase = await createClient();
  // The database function only touches the logged-in user's own sessions.
  await supabase.rpc("revoke_session", { p_session_id: target });
  revalidatePath("/profile/sessions");
}

/** Log out every device except this one. */
export async function revokeOtherDevices() {
  await requireMember();
  const { sessionId: current } = await getAuthState();
  if (!current) return;

  const supabase = await createClient();
  await supabase.rpc("revoke_other_sessions", { p_keep: current });
  // Also end the other devices' Supabase logins, not just our sessions.
  await supabase.auth.signOut({ scope: "others" });
  revalidatePath("/profile/sessions");
}

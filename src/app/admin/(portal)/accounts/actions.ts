"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// Each action re-checks the admin role (requireAdmin + the database
// function's is_admin check). Triggers audit every change, old -> new.

export type AccountState = { error?: string; ok?: string };

function friendly(message: string | undefined, fallback: string) {
  // The database functions raise plain-English messages; show those.
  return message && !/[{}()]|violates|syntax/.test(message) ? message : fallback;
}

export async function activateAccount(_prev: AccountState, form: FormData): Promise<AccountState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_activate_account", {
    p_profile: String(form.get("profile_id") ?? ""),
    p_hospital_no: String(form.get("hospital_no") ?? "").trim().slice(0, 30),
    p_relationship: String(form.get("relationship") ?? "").trim().slice(0, 40),
  });
  if (error) return { error: friendly(error.message, "Couldn't activate the account.") };
  revalidatePath("/admin/accounts");
  return { ok: "Activated." };
}

export async function rejectAccount(_prev: AccountState, form: FormData): Promise<AccountState> {
  await requireAdmin();
  const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 5) return { error: "Write the reason — the person will see it." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reject_account", {
    p_profile: String(form.get("profile_id") ?? ""),
    p_reason: reason,
  });
  if (error) return { error: friendly(error.message, "Couldn't reject the account.") };
  revalidatePath("/admin/accounts");
  return { ok: "Rejected." };
}

export async function recordConsent(form: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.rpc("admin_record_consent", { p_link: String(form.get("link_id") ?? "") });
  revalidatePath("/admin/accounts");
}

export async function setRole(_prev: AccountState, form: FormData): Promise<AccountState> {
  await requireAdmin();
  const role = String(form.get("role") ?? "");
  if (!["admin", "patient", "caregiver"].includes(role)) return { error: "Choose a role." };
  const supabase = await createClient();

  let profileId = String(form.get("profile_id") ?? "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!profileId && email) {
    // Adding staff: the person signs up first, then is promoted here.
    const { data } = await supabase.from("profiles").select("id").ilike("email", email).maybeSingle();
    if (!data) return { error: "No account with that email. Ask them to sign up first." };
    profileId = data.id;
  }
  const { error } = await supabase.rpc("admin_set_role", { p_profile: profileId, p_role: role });
  if (error) return { error: friendly(error.message, "Couldn't change the role.") };
  revalidatePath("/admin/accounts");
  return { ok: "Role updated." };
}

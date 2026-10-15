"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { newPasswordSchema } from "@/lib/validation";

export type FormState = { error?: string; ok?: string };

export async function updatePhone(_prev: FormState, form: FormData): Promise<FormState> {
  const profile = await requireMember();
  const phone = String(form.get("phone") ?? "").replace(/[\s-]/g, "");
  if (!/^09\d{9}$/.test(phone)) return { error: "Use the format 09XX XXX XXXX." };
  const supabase = await createClient();
  // RLS: only your own row. The column guard only lets you change the phone.
  const { error } = await supabase.from("profiles").update({ phone }).eq("id", profile.id);
  if (error) return { error: "Couldn't save the number." };
  revalidatePath("/profile");
  return { ok: "Phone number saved." };
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  await requireMember();
  const parsed = newPasswordSchema.safeParse(form.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (form.get("confirm") !== parsed.data) return { error: "The two passwords don't match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return {
      error: error.code === "same_password" ? "Choose a password different from your current one." : "Couldn't change the password.",
    };
  }
  return { ok: "Password changed. Use it next time you log in." };
}

const nameSchema = z.string().trim().min(2, "Enter your full name as shown on your ID.").max(100);

/** Names must match the ID, so the records office checks name changes. */
export async function requestNameChange(_prev: FormState, form: FormData): Promise<FormState> {
  await requireMember();
  const parsed = nameSchema.safeParse(form.get("full_name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_account_change", { p_kind: "name_change", p_new_value: parsed.data });
  if (error) return { error: error.message.includes("pending") ? "You already have a name change waiting." : "Couldn't send the request." };
  revalidatePath("/profile");
  return { ok: "Sent to the records office. Bring your ID if they ask." };
}

export async function requestDeletion(_prev: FormState, form: FormData): Promise<FormState> {
  await requireMember();
  if (form.get("confirm") !== "on") return { error: "Tick the box to confirm you understand." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_account_change", { p_kind: "deletion", p_new_value: null });
  if (error) return { error: error.message.includes("pending") ? "Your deletion request is already waiting." : "Couldn't send the request." };
  revalidatePath("/profile");
  return { ok: "Deletion requested. The records office will confirm it with you." };
}

const suggestionSchema = z.object({
  name: z.string().trim().min(2, "Enter the facility's name.").max(120),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  reason: z.string().trim().max(500).optional(),
});

export async function suggestFacility(_prev: FormState, form: FormData): Promise<FormState> {
  await requireMember();
  const parsed = suggestionSchema.safeParse({
    name: form.get("name"),
    city: form.get("city"),
    reason: form.get("reason") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("facility_suggestions").insert({ ...parsed.data, reason: parsed.data.reason ?? null });
  if (error) return { error: "Couldn't send the suggestion." };
  return { ok: "Thank you — we'll pass it on." };
}

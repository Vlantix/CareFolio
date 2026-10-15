"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";

// Every change below is checked and audited inside the database
// (invite_caregiver, approve_caregiver_link, revoke_caregiver_link).

export type InviteState = { error?: string; sent?: string };

const inviteSchema = z.object({
  email: z.email({ error: "Enter their email address." }),
  relationship: z.string().trim().min(2, "Say how they're related, e.g. Daughter.").max(40),
});

export async function inviteCaregiver(_prev: InviteState, form: FormData): Promise<InviteState> {
  await requireMember();
  const { active } = await getActivePatient();
  if (!active) return { error: "No patient linked yet." };
  const parsed = inviteSchema.safeParse({ email: form.get("email"), relationship: form.get("relationship") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_caregiver", {
    p_patient: active.id,
    p_email: parsed.data.email,
    p_relationship: parsed.data.relationship,
  });
  if (error) return { error: "You can't invite caregivers for this patient." };
  revalidatePath("/family");
  // Same answer whether or not the email has an account (no account lookup leaks).
  return { sent: parsed.data.email };
}

export async function approveCaregiver(form: FormData) {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_caregiver_link", { p_link: String(form.get("linkId") ?? "") });
  if (error) redirect("/family?error=1");
  revalidatePath("/family");
}

export async function removeCaregiver(form: FormData) {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_caregiver_link", { p_link: String(form.get("linkId") ?? "") });
  if (error) redirect("/family?error=1");
  revalidatePath("/family");
  revalidatePath("/", "layout");
}

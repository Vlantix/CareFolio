"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { DOC_TYPES, PURPOSES } from "@/lib/records";

export type WalkInState = { error?: string; ok?: string };

/** Log a request made in person at the records office (audited by trigger). */
export async function createWalkIn(_prev: WalkInState, form: FormData): Promise<WalkInState> {
  await requireAdmin();
  const docType = String(form.get("doc_type") ?? "");
  const purpose = String(form.get("purpose") ?? "");
  if (!(docType in DOC_TYPES) || !(PURPOSES as readonly string[]).includes(purpose)) {
    return { error: "Choose the document and purpose." };
  }
  const urgent = form.get("is_urgent") === "on";
  const supabase = await createClient();
  const { data: code, error } = await supabase.rpc("admin_create_walkin", {
    p_patient: String(form.get("patient_id") ?? ""),
    p_doc_type: docType,
    p_detail: String(form.get("detail") ?? "").slice(0, 200),
    p_purpose: purpose,
    p_walk_in_name: String(form.get("walk_in_name") ?? "").slice(0, 100),
    p_is_urgent: urgent,
    p_urgent_reason: urgent ? String(form.get("urgent_reason") ?? "").slice(0, 300) : null,
  });
  if (error) {
    return { error: /name|Fill in|reason/.test(error.message) ? error.message : "Couldn't add the request." };
  }
  revalidatePath("/admin");
  return { ok: `Added ${code} to the queue.` };
}

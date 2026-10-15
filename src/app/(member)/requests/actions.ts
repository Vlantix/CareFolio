"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";
import { requestSchema } from "@/lib/request-schema";
import { fieldErrors, formToObject } from "@/lib/validation";

export type NewRequestState = { error?: string; fields?: Record<string, string> };

export async function createRequest(_prev: NewRequestState, form: FormData): Promise<NewRequestState> {
  const profile = await requireMember();
  if (profile.status !== "active") return { error: "Requests open once the records office approves your account." };

  const parsed = requestSchema.safeParse(formToObject(form));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const { active } = await getActivePatient();
  if (!active) return { error: "Your account isn't linked to a patient yet." };

  const supabase = await createClient();
  // The database function checks permission again, inserts, sets the due
  // date and writes the 'request.created' audit row.
  const { error } = await supabase.rpc("create_request", {
    p_patient: active.id,
    p_doc_type: parsed.data.doc_type,
    p_detail: parsed.data.detail,
    p_purpose: parsed.data.purpose,
    p_is_urgent: !!parsed.data.is_urgent,
    p_urgent_reason: parsed.data.is_urgent ? parsed.data.urgent_reason : null,
  });
  if (error) return { error: "We couldn't send the request. Please try again." };

  revalidatePath("/requests");
  revalidatePath("/home");
  redirect("/requests?sent=1");
}

export type ReplyState = { error?: string; ok?: boolean };

/** Answer the records office's question (status goes back to review). */
export async function replyToRecordsOffice(_prev: ReplyState, form: FormData): Promise<ReplyState> {
  await requireMember();
  const id = String(form.get("requestId") ?? "");
  const reply = String(form.get("reply") ?? "").trim();
  if (reply.length < 2) return { error: "Type your answer first." };
  if (reply.length > 1000) return { error: "Keep it under 1,000 characters." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_info_request", { p_request: id, p_reply: reply });
  if (error) return { error: "We couldn't send your answer. Please try again." };
  revalidatePath("/requests");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { stampAndStore } from "@/lib/admin";
import { FACILITY_NAME } from "@/lib/facility";

// Every action re-checks the admin role on the server (requireAdmin +
// RLS is_admin). The audit trigger records each change with old -> new.

export type DecisionState = { error?: string; ok?: string };

/** Approve / Ask for info / Decline. */
export async function decideRequest(_prev: DecisionState, form: FormData): Promise<DecisionState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decision") ?? "");
  const text = String(form.get("text") ?? "").trim();
  const supabase = await createClient();

  let change: Record<string, string>;
  if (decision === "approve") change = { status: "approved" };
  else if (decision === "info") {
    if (text.length < 5) return { error: "Write the question for the requester." };
    change = { status: "info_requested", info_question: text.slice(0, 500) };
  } else if (decision === "decline") {
    if (text.length < 5) return { error: "Write the reason — the requester will see it." };
    change = { status: "declined", decline_reason: text.slice(0, 500) };
  } else return { error: "Choose a decision." };

  const { data, error } = await supabase
    .from("requests")
    .update(change)
    .eq("id", id)
    .in("status", ["submitted", "under_review", "info_requested", "approved"])
    .select("id");
  if (error || !data?.length) return { error: "That request can't be changed any more." };
  revalidatePath(`/admin/requests/${id}`);
  revalidatePath("/admin");
  return { ok: decision === "approve" ? "Approved. You can release it below." : "Sent to the requester." };
}

export type ReleaseState = { error?: string };

/** Stamp + upload the PDF, create the document, mark the request released. */
export async function releaseRequest(_prev: ReleaseState, form: FormData): Promise<ReleaseState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const checks = ["check_identity", "check_consent", "check_record", "check_purpose", "confirm_patient"];
  if (checks.some((c) => form.get(c) !== "on")) {
    return { error: "Tick every check and confirm the patient before releasing." };
  }
  const title = String(form.get("title") ?? "").trim();
  const doctor = String(form.get("doctor") ?? "").trim();
  const recordDate = String(form.get("record_date") ?? "");
  if (title.length < 3) return { error: "Give the document a title." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordDate)) return { error: "Enter the record's date." };

  const supabase = await createClient();
  const { data: req } = await supabase
    .from("requests")
    .select("id, patient_id, requester_id, status, channel, patients(profile_id)")
    .eq("id", id)
    .maybeSingle();
  if (!req) return { error: "Request not found." };

  // Re-check on the server what the ticks claim. (Walk-ins: staff
  // checked ID and authorization in person at the counter.)
  if (req.channel !== "walk_in") {
  const { data: requester } = await supabase.from("profiles").select("status").eq("id", req.requester_id).maybeSingle();
  if (requester?.status !== "active") return { error: "The requester's account isn't verified." };
  const isSelf = (req.patients as unknown as { profile_id: string | null } | null)?.profile_id === req.requester_id;
  if (!isSelf) {
    const { data: link } = await supabase
      .from("caregiver_links")
      .select("consent_at")
      .eq("patient_id", req.patient_id)
      .eq("caregiver_id", req.requester_id)
      .eq("status", "active")
      .maybeSingle();
    if (!link?.consent_at) return { error: "No caregiver consent is on file for this requester." };
  }
  }

  const file = form.get("file");
  const stored = await stampAndStore(supabase, req.patient_id, file instanceof File ? file : null, title);
  if (!stored.ok) return { error: stored.error };

  const { error } = await supabase.rpc("admin_release_request", {
    p_request: id,
    p_file_path: stored.path,
    p_title: title,
    p_doctor: doctor,
    p_record_date: recordDate,
    p_code: stored.code,
    p_facility: FACILITY_NAME,
  });
  if (error) {
    await supabase.storage.from("documents").remove([stored.path]);
    return { error: "Release failed. Nothing was sent; please try again." };
  }
  revalidatePath("/admin");
  redirect(`/admin?released=${stored.code}`);
}

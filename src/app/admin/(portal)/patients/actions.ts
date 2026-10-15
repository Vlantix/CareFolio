"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { stampAndStore } from "@/lib/admin";
import { FACILITY_NAME } from "@/lib/facility";
import { DOC_TYPES } from "@/lib/records";
import { RECORD_TABLES, isRecordTable } from "./record-tables";

// Staff only (requireAdmin here + admin-only RLS in the database). The
// audit trigger records every add / edit / remove with old -> new values,
// and stamps "updated by" on the row.

export type EntryState = { error?: string; ok?: boolean };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Add (no id) or edit (with id) a medication, allergy, diagnosis or lab value. */
export async function saveEntry(_prev: EntryState, form: FormData): Promise<EntryState> {
  await requireAdmin();
  const table = String(form.get("table") ?? "");
  if (!isRecordTable(table)) return { error: "Unknown section." };
  const patientId = String(form.get("patient_id") ?? "");
  const id = String(form.get("id") ?? "");

  const row: Record<string, string | null> = {};
  for (const f of RECORD_TABLES[table].fields) {
    const v = String(form.get(f.name) ?? "").trim().slice(0, 200);
    if ("required" in f && f.required && !v) return { error: `${f.label} is required.` };
    row[f.name] = v || null;
  }
  const recordDate = String(form.get("record_date") ?? "");
  if (!DATE.test(recordDate)) return { error: "Enter the date." };
  row.record_date = recordDate;
  row.source = String(form.get("source") ?? "").trim().slice(0, 120) || FACILITY_NAME;

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from(table).update(row).eq("id", id).eq("patient_id", patientId)
    : await supabase.from(table).insert({ ...row, patient_id: patientId });
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath(`/admin/patients/${patientId}`);
  return { ok: true };
}

export async function removeEntry(form: FormData) {
  await requireAdmin();
  const table = String(form.get("table") ?? "");
  if (!isRecordTable(table)) return;
  const patientId = String(form.get("patient_id") ?? "");
  const supabase = await createClient();
  await supabase.from(table).delete().eq("id", String(form.get("id") ?? "")).eq("patient_id", patientId);
  revalidatePath(`/admin/patients/${patientId}`);
}

/** Upload a document straight into a patient's records (stamped + coded). */
export async function addDocument(_prev: EntryState, form: FormData): Promise<EntryState> {
  await requireAdmin();
  const patientId = String(form.get("patient_id") ?? "");
  const type = String(form.get("type") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const doctor = String(form.get("doctor") ?? "").trim();
  const recordDate = String(form.get("record_date") ?? "");
  if (!(type in DOC_TYPES)) return { error: "Choose the document type." };
  if (title.length < 3) return { error: "Give the document a title." };
  if (!DATE.test(recordDate)) return { error: "Enter the record's date." };

  const supabase = await createClient();
  const file = form.get("file");
  const stored = await stampAndStore(supabase, patientId, file instanceof File ? file : null, title);
  if (!stored.ok) return { error: stored.error };
  const { error } = await supabase.rpc("admin_add_document", {
    p_patient: patientId,
    p_type: type,
    p_file_path: stored.path,
    p_title: title,
    p_doctor: doctor,
    p_record_date: recordDate,
    p_code: stored.code,
    p_facility: FACILITY_NAME,
  });
  if (error) {
    await supabase.storage.from("documents").remove([stored.path]);
    return { error: "Couldn't add the document." };
  }
  revalidatePath(`/admin/patients/${patientId}`);
  return { ok: true };
}

/** Edit a document's details (not the file — upload a new one for that). */
export async function updateDocument(_prev: EntryState, form: FormData): Promise<EntryState> {
  await requireAdmin();
  const patientId = String(form.get("patient_id") ?? "");
  const title = String(form.get("title") ?? "").trim().slice(0, 150);
  const recordDate = String(form.get("record_date") ?? "");
  if (title.length < 3) return { error: "Give the document a title." };
  if (!DATE.test(recordDate)) return { error: "Enter the record's date." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({ title, doctor: String(form.get("doctor") ?? "").trim().slice(0, 100) || null, record_date: recordDate })
    .eq("id", String(form.get("id") ?? ""))
    .eq("patient_id", patientId);
  if (error) return { error: "Couldn't save." };
  revalidatePath(`/admin/patients/${patientId}`);
  return { ok: true };
}

/**
 * "Remove" withdraws a document: patients stop seeing it, but the row and
 * file stay for the audit trail (and requests that point at it).
 */
export async function withdrawDocument(form: FormData) {
  await requireAdmin();
  const patientId = String(form.get("patient_id") ?? "");
  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ released_at: null })
    .eq("id", String(form.get("id") ?? ""))
    .eq("patient_id", patientId);
  revalidatePath(`/admin/patients/${patientId}`);
}

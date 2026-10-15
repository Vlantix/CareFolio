"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

/**
 * Mark a correction corrected or rejected. Rejecting needs a note (also
 * enforced in the database). The requester is notified by a trigger and
 * the change is audited.
 */
export async function resolveCorrection(form: FormData) {
  await requireAdmin();
  const status = String(form.get("status") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  if (status !== "fixed" && status !== "rejected") return;
  if (status === "rejected" && note.length < 5) redirect("/admin/corrections?error=1");
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_correction", {
    p_id: String(form.get("id") ?? ""),
    p_status: status,
    p_note: note,
  });
  if (error) redirect("/admin/corrections?error=1");
  revalidatePath("/admin/corrections");
}

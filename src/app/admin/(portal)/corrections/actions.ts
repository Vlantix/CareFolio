"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

/** Mark a correction fixed or rejected (audited; the requester is notified). */
export async function resolveCorrection(form: FormData) {
  await requireAdmin();
  const status = String(form.get("status") ?? "");
  if (status !== "fixed" && status !== "rejected") return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_correction", {
    p_id: String(form.get("id") ?? ""),
    p_status: status,
    p_note: String(form.get("note") ?? "").slice(0, 500),
  });
  if (error) redirect("/admin/corrections?error=1");
  revalidatePath("/admin/corrections");
}

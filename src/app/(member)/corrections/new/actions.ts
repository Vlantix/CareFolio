"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";

export type CorrectionState = { error?: string };

const KINDS = ["wrong_value", "missing_record", "outdated_medications"];

export async function sendCorrection(_prev: CorrectionState, form: FormData): Promise<CorrectionState> {
  const profile = await requireMember();
  if (profile.status !== "active") return { error: "Corrections open once the records office approves your account." };
  const { active } = await getActivePatient();
  if (!active) return { error: "No patient linked yet." };

  const kind = String(form.get("kind") ?? "");
  const document = String(form.get("document") ?? "");
  const details = String(form.get("details") ?? "").trim();
  if (!KINDS.includes(kind)) return { error: "Choose what the problem is." };
  if (details.length < 5) return { error: "Describe what's wrong in a few words." };
  if (details.length > 2000) return { error: "Keep the details under 2,000 characters." };

  const supabase = await createClient();
  // Creates the request, notifies the records office, writes the audit
  // row. It never changes the record itself.
  const { error } = await supabase.rpc("create_correction", {
    p_patient: active.id,
    p_kind: kind,
    p_document: /^[0-9a-f-]{36}$/.test(document) ? document : null,
    p_details: details,
  });
  if (error) return { error: "We couldn't send it. Please try again." };
  redirect("/requests?correction=1");
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth";

const REASONS = ["window_blur", "tab_hidden", "print_screen", "print"] as const;
export type HiddenReason = (typeof REASONS)[number];

/**
 * Audit row 'document.hidden' when the protected view blurred. The
 * database checks access and keeps at most one per minute per document.
 */
export async function logHidden(patientId: string, documentId: string | null, reason: HiddenReason) {
  const { mfa } = await getAuthState();
  if (!mfa || !REASONS.includes(reason)) return;
  const supabase = await createClient();
  await supabase.rpc("log_record_event", {
    p_action: "document.hidden",
    p_patient: patientId,
    p_document: documentId,
    p_details: { reason },
  });
}

/** Audit row when the summary's own Print PDF button is used. */
export async function logSummaryPrinted(patientId: string) {
  const { mfa } = await getAuthState();
  if (!mfa) return;
  const supabase = await createClient();
  await supabase.rpc("log_record_event", {
    p_action: "summary.printed",
    p_patient: patientId,
    p_document: null,
    p_details: {},
  });
}

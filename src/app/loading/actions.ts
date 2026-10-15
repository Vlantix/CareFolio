"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthState, homeFor } from "@/lib/auth";

export type StepResult = { ok: boolean; next?: string };

/**
 * One real check per line of the loading checklist. The screen ticks a
 * line only when its check comes back, so the checklist never lies.
 *   0 Identity verified       — logged in and passed the email code
 *   1 Secure session started  — this device's session is live
 *   2 Loading records         — placeholder until ticket 04 (see below)
 *   3 Preparing summary       — unread notices; then says where to go
 */
export async function runLoadingStep(step: number): Promise<StepResult> {
  const { userId, mfa, sessionId, profile } = await getAuthState();
  if (!userId) return { ok: false, next: "/login" };
  if (!mfa) return { ok: false, next: "/verify" };

  const supabase = await createClient();
  switch (step) {
    case 0:
      return { ok: !!profile };
    case 1:
      return { ok: !!sessionId };
    case 2:
      // PLACEHOLDER until ticket 04: there are no linked patients to load
      // yet (the patient_links table doesn't exist). Ticket 04 replaces
      // this with a real query that must succeed before the line ticks.
      return { ok: true };
    case 3: {
      const { error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) return { ok: false };
      return { ok: true, next: homeFor(profile) };
    }
    default:
      return { ok: false };
  }
}

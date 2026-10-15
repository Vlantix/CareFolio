"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth";

export type TermsState = { error?: string };

export async function acceptTerms(_prev: TermsState, form: FormData): Promise<TermsState> {
  if (form.get("terms") !== "on" || form.get("privacy") !== "on") {
    return { error: "Tick both boxes to continue." };
  }
  const { userId, mfa } = await getAuthState();
  if (!userId) redirect("/login");
  if (!mfa) redirect("/verify");

  // Saves terms_accepted_at AND privacy_consent_at, and writes the
  // 'terms.accepted' audit row — all in one database function.
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_terms");
  if (error) return { error: "We couldn't save that. Please try again." };

  redirect("/home");
}

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
  if (!userId || !mfa) redirect("/login");

  const supabase = await createClient();
  // RLS only lets you update your own row.
  const { error } = await supabase
    .from("profiles")
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { error: "We couldn't save that. Please try again." };

  redirect("/home");
}

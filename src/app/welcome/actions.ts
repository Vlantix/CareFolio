"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth";

/** Finished step 3 of the guide: save it (with an audit row), go to terms. */
export async function finishOnboarding() {
  const { userId, mfa } = await getAuthState();
  if (!userId) redirect("/login");
  if (!mfa) redirect("/verify");

  const supabase = await createClient();
  const { error } = await supabase.rpc("finish_onboarding");
  if (error) return { error: "We couldn't save that. Please try again." };
  redirect("/terms");
}

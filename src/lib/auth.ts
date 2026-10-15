import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MFA_COOKIE, isMfaTokenValid } from "@/lib/mfa";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: "patient" | "caregiver" | "admin";
  terms_accepted_at: string | null;
};

/**
 * Who is asking, worked out once per request. `cache` means calling it
 * from a layout and a page costs one lookup, not two.
 */
export const getAuthState = cache(async () => {
  // Read cookies first: this marks every page that checks login as
  // "render on each request", never pre-built at deploy time.
  const cookieStore = await cookies();
  const supabase = await createClient();
  // getClaims checks the login token's signature, so it can be trusted
  // (unlike getSession, which just reads the cookie).
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { userId: null, mfa: false, profile: null } as const;

  const mfa = await isMfaTokenValid(cookieStore.get(MFA_COOKIE)?.value, userId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, terms_accepted_at")
    .eq("id", userId)
    .maybeSingle<Profile>();

  return { userId, mfa, profile } as const;
});

/**
 * Patients and caregivers. Call at the top of every member page.
 * proxy.ts already redirects, but pages check again: the proxy is a
 * convenience, this is the guarantee.
 */
export async function requireMember() {
  const { userId, mfa, profile } = await getAuthState();
  if (!userId) redirect("/login");
  if (!mfa) redirect("/verify");
  if (!profile) throw new Error("Profile missing — has supabase/sql/002-profiles.sql been run?");
  if (!profile.terms_accepted_at && profile.role !== "admin") redirect("/terms");
  return profile;
}

/**
 * Records office only. Anyone else gets the ordinary 404 page, so the
 * staff area looks exactly like a page that doesn't exist.
 */
export async function requireAdmin() {
  const { mfa, profile } = await getAuthState();
  if (!mfa || profile?.role !== "admin") notFound();
  return profile;
}

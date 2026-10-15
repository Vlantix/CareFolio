"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";
import {
  SHARE_DURATIONS,
  SHARE_SECTIONS,
  hashAccessCode,
  newShareToken,
  siteUrl,
  type ShareSection,
} from "@/lib/share";

export type ShareState = {
  error?: string;
  /** Shown ONCE, right after creating. Never stored. */
  link?: { id: string; url: string; expiresAt: string; code: string | null };
};

export async function createShare(_prev: ShareState, form: FormData): Promise<ShareState> {
  await requireMember();
  const { active } = await getActivePatient();
  if (!active) return { error: "No patient linked yet." };

  const sections = form.getAll("sections").map(String) as ShareSection[];
  if (sections.length === 0 || sections.some((s) => !(s in SHARE_SECTIONS))) {
    return { error: "Choose at least one section to share." };
  }
  const minutes = Number(form.get("minutes"));
  if (!(minutes in SHARE_DURATIONS)) return { error: "Choose how long the link lasts." };
  const code = String(form.get("code") ?? "").trim();
  if (code && !/^\d{4}$/.test(code)) return { error: "The access code must be 4 digits." };

  const { token, hash } = newShareToken();
  const supabase = await createClient();
  // The database checks permission (patient, or caregiver allowed to
  // share), stores ONLY the hash, and writes the 'share.created' audit row.
  const { data, error } = await supabase.rpc("create_share_link", {
    p_patient: active.id,
    p_token_hash: hash,
    p_sections: sections,
    p_minutes: minutes,
    p_code_hash: code ? hashAccessCode(hash, code) : null,
  });
  const created = data as { id: string; expires_at: string } | null;
  if (error || !created) return { error: "We couldn't create the link. Please try again." };

  revalidatePath("/share");
  return {
    link: {
      id: created.id,
      url: `${await siteUrl()}/s/${token}`,
      // The database's own expiry, so the countdown matches the link.
      expiresAt: created.expires_at,
      code: code || null,
    },
  };
}

export async function revokeShare(form: FormData) {
  await requireMember();
  const id = String(form.get("linkId") ?? "");
  const supabase = await createClient();
  await supabase.rpc("revoke_share_link", { p_link: id });
  revalidatePath("/share");
}

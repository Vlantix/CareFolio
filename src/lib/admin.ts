import "server-only";
import { randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { MAX_UPLOAD_BYTES, stampReleaseFooter } from "@/lib/pdf-stamp";
import { siteUrl } from "@/lib/share";

// No look-alike characters: no 0/O and no 1/I (matches the database check).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** CF-XXXX-XXXX using crypto randomness, checked unused in the database. */
export async function newVerificationCode(supabase: Awaited<ReturnType<typeof createClient>>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const pick = () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    const code = `CF-${Array.from({ length: 4 }, pick).join("")}-${Array.from({ length: 4 }, pick).join("")}`;
    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("verification_code", code);
    if (!count) return code;
  }
  throw new Error("Could not find an unused code");
}

export type UploadResult = { ok: true; path: string; code: string } | { ok: false; error: string };

/**
 * Check an uploaded PDF, stamp the verification footer on every page and
 * store it in the private documents bucket under the patient's folder.
 * Uses the staff member's own login (storage RLS: admins only).
 */
export async function stampAndStore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
  file: File | null,
  nameHint: string,
): Promise<UploadResult> {
  if (!file || file.size === 0) return { ok: false, error: "Choose the PDF to release." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "The PDF must be 4 MB or smaller." };
  const bytes = await file.arrayBuffer();
  // A real PDF starts with "%PDF" (don't trust the file name or type).
  if (new TextDecoder().decode(bytes.slice(0, 4)) !== "%PDF") {
    return { ok: false, error: "That file isn't a PDF." };
  }

  const code = await newVerificationCode(supabase);
  let stamped: Uint8Array;
  try {
    stamped = await stampReleaseFooter(bytes, `Verify at ${await siteUrl()}/verify-document   Code ${code}`);
  } catch {
    return { ok: false, error: "That PDF couldn't be read. Try exporting it again." };
  }
  const safeName = nameHint.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "document";
  const path = `${patientId}/${safeName}-${code}.pdf`;
  const { error } = await supabase.storage
    .from("documents")
    .upload(path, stamped, { contentType: "application/pdf", upsert: false });
  if (error) return { ok: false, error: "Upload failed. Please try again." };
  return { ok: true, path, code };
}


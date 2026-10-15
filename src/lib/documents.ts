import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth";
import { MAX_PDF_BYTES } from "@/lib/pdf-stamp";

export type DocumentRow = {
  id: string;
  patient_id: string;
  type: string;
  title: string;
  facility: string;
  doctor: string | null;
  record_date: string;
  file_path: string;
  verification_code: string;
};

/**
 * Load one released document for the logged-in, verified user. RLS
 * (passed_email_code + can_access_patient) returns nothing for anyone
 * else, so "not found" and "not allowed" look the same.
 */
export async function loadDocument(id: string) {
  const { mfa, profile } = await getAuthState();
  if (!mfa || !profile) return null;
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id, patient_id, type, title, facility, doctor, record_date, file_path, verification_code")
    .eq("id", id)
    .maybeSingle<DocumentRow>();
  if (!data) return null;
  return { doc: data, profile, supabase };
}

/**
 * Fetch the file through a 60-second signed link (made with the user's
 * own login, so the storage rules apply) and refuse anything too big.
 */
export async function fetchDocumentFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filePath: string,
) {
  const { data: signed, error } = await supabase.storage.from("documents").createSignedUrl(filePath, 60);
  if (error || !signed) return null;
  const res = await fetch(signed.signedUrl);
  if (!res.ok) return null;
  if (Number(res.headers.get("content-length") ?? 0) > MAX_PDF_BYTES) return null;
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > MAX_PDF_BYTES) return null;
  return bytes;
}

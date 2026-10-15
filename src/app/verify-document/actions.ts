"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type VerifyResult =
  | { status: "idle" }
  | { status: "invalid" | "not_found" | "rate_limited" | "error"; code: string }
  | {
      status: "authentic";
      code: string;
      type: string;
      title: string;
      patient: string;
      facility: string;
      released_at: string;
    };

/**
 * Public check of a verification code (no login). The database function
 * rate-limits per IP (10 per 10 minutes) and overall, and only ever
 * returns the type, a masked name, the facility and the release date.
 */
export async function checkCode(_prev: VerifyResult, form: FormData): Promise<VerifyResult> {
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  if (!/^CF-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return { status: "invalid", code };

  const h = await headers();
  // Vercel puts the visitor's address first in x-forwarded-for.
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown").split(",")[0].trim();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_document_code", { p_code: code, p_ip: ip });
  if (error || !data) return { status: "error", code };
  return { ...(data as Omit<Extract<VerifyResult, { status: "authentic" }>, "code">), code } as VerifyResult;
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hashAccessCode, hashToken, shareCodeCookie } from "@/lib/share";

export type CodeState = { error?: string };

/**
 * The doctor types the spoken 4-digit code. The database counts wrong
 * tries (5 max per link). A correct code is remembered for this link
 * only, until it expires.
 */
export async function submitShareCode(token: string, _prev: CodeState, form: FormData): Promise<CodeState> {
  const code = String(form.get("code") ?? "").trim();
  if (!/^\d{4}$/.test(code)) return { error: "Enter the 4-digit code." };
  if (!/^[\w-]{43}$/.test(token)) return { error: "This link is not valid." };

  const tokenHash = hashToken(token);
  const codeHash = hashAccessCode(tokenHash, code);
  const supabase = await createClient();
  const { data } = await supabase.rpc("check_share_code", { p_token_hash: tokenHash, p_code_hash: codeHash });
  const status = (data as { status: string; tries_left?: number } | null)?.status;

  if (status === "wrong_code") {
    const left = (data as { tries_left: number }).tries_left;
    return { error: `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` };
  }
  if (status === "ok") {
    (await cookies()).set(shareCodeCookie(tokenHash), codeHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: `/s/${token}`,
      maxAge: 60 * 60 * 24,
    });
  }
  // ok, locked or expired: the page shows the right screen.
  redirect(`/s/${token}`);
}

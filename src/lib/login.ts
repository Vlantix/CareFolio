import "server-only";
import { createClient } from "@/lib/supabase/server";

// The email code must follow a password login made in the last 30
// minutes. Without this, someone with only access to the mailbox could
// ask Supabase for a code directly and skip the password entirely — and
// a device that was logged out from the Devices page (whose old
// Supabase login lingers) would trigger code emails to the owner.
const PASSWORD_WINDOW_SECONDS = 30 * 60;

/** The current Supabase login, and whether it began with a recent password. */
export async function currentLogin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || !claims.email) return null;

  const now = Math.floor(Date.now() / 1000);
  const amr = (claims.amr ?? []) as Array<{ method: string; timestamp: number } | string>;
  const passwordRecently = amr.some(
    (entry) =>
      typeof entry === "object" &&
      entry.method === "password" &&
      now - entry.timestamp < PASSWORD_WINDOW_SECONDS,
  );
  return {
    supabase,
    userId: claims.sub,
    email: claims.email,
    sessionId: claims.session_id as string | undefined,
    passwordRecently,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";

/** Hide a notice on Home. The database only marks the user's own. */
export async function dismissNotification(form: FormData) {
  await requireMember();
  const id = String(form.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.rpc("mark_notification_read", { p_id: id });
  revalidatePath("/home");
}

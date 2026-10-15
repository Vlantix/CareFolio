"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireVerified } from "@/lib/auth";

/** Mark every notice read (your own only — checked in the database). */
export async function markAllRead(form: FormData) {
  const { staff } = await requireVerified();
  const page = staff ? "/admin/notifications" : "/notifications";
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) redirect(`${page}?error=1`);
  void form;
  revalidatePath(page);
}

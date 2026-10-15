"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";

export async function markAllRead() {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) redirect("/notifications?error=1");
  revalidatePath("/notifications");
  revalidatePath("/home");
}

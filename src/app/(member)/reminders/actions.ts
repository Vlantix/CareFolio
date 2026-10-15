"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";

// Reminders are the user's own notes, not official records, so they're
// written directly — RLS allows only your own rows, for patients you
// can access.

const reminderSchema = z.object({
  kind: z.enum(["appointment", "refill", "lab"]),
  title: z.string().trim().min(2, "Give it a short title.").max(120),
  note: z.string().trim().max(200).optional(),
  // <input type="datetime-local"> gives "2026-10-15T10:00" — read as Manila time.
  due: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time."),
});

export type ReminderState = { error?: string; ok?: boolean };

function parse(form: FormData) {
  return reminderSchema.safeParse({
    kind: form.get("kind"),
    title: form.get("title"),
    note: form.get("note") || undefined,
    due: form.get("due"),
  });
}

export async function addReminder(_prev: ReminderState, form: FormData): Promise<ReminderState> {
  await requireMember();
  const { active } = await getActivePatient();
  if (!active) return { error: "No patient linked yet." };
  const parsed = parse(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("reminders").insert({
    patient_id: active.id,
    kind: parsed.data.kind,
    title: parsed.data.title,
    note: parsed.data.note ?? null,
    due_at: `${parsed.data.due}:00+08:00`,
  });
  if (error) return { error: "We couldn't save the reminder." };
  revalidatePath("/reminders");
  return { ok: true };
}

export async function editReminder(_prev: ReminderState, form: FormData): Promise<ReminderState> {
  await requireMember();
  const parsed = parse(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .update({
      kind: parsed.data.kind,
      title: parsed.data.title,
      note: parsed.data.note ?? null,
      due_at: `${parsed.data.due}:00+08:00`,
      notified_at: null, // a new time means a new heads-up
    })
    .eq("id", String(form.get("id") ?? ""));
  if (error) return { error: "We couldn't save the changes." };
  revalidatePath("/reminders");
  return { ok: true };
}

export async function deleteReminder(form: FormData) {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.from("reminders").delete().eq("id", String(form.get("id") ?? ""));
  if (error) redirect("/reminders?error=1");
  revalidatePath("/reminders");
}

export async function saveReminderSettings(form: FormData) {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.from("reminder_settings").upsert({
    appointments: form.get("appointments") === "on",
    refills: form.get("refills") === "on",
    labs: form.get("labs") === "on",
  });
  if (error) redirect("/reminders?error=1");
  revalidatePath("/reminders");
}

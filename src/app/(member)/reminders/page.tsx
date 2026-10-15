import { FormAlert } from "@/components/ui/form-alert";
import { BackButton } from "@/components/ui/page-header";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";
import { createClient } from "@/lib/supabase/server";
import { timeOfDay } from "@/lib/dates";
import { deleteReminder } from "./actions";
import { EditReminder, ReminderForm, SettingsForm } from "./forms";

export const metadata = { title: "Reminders · CareFolio" };

const KIND_LABEL: Record<string, string> = { appointment: "Check-up", refill: "Refill", lab: "Lab test" };
const manila = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-PH", { ...opts, timeZone: "Asia/Manila" }).format(new Date(iso));
/** "2026-10-15T10:00" in Manila time, for <input type="datetime-local">. */
function localInput(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "Asia/Manila",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`;
}

/** Keep showing a reminder for an hour after it was due. */
function anHourAgo() {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString();
}

// design/MReminders.html
export default async function RemindersPage({ searchParams }: PageProps<"/reminders">) {
  await requireMember();
  const { error } = await searchParams;
  const { active } = await getActivePatient();
  const supabase = await createClient();
  const [{ data: settings }, { data: reminders }] = await Promise.all([
    supabase.from("reminder_settings").select("appointments, refills, labs").maybeSingle(),
    supabase
      .from("reminders")
      .select("id, kind, title, note, due_at, enabled")
      .gte("due_at", anHourAgo())
      .order("due_at"),
  ]);

  return (
    <main className="flex flex-col gap-4 px-5 pt-5 pb-6 md:max-w-2xl md:px-10 md:py-8">
      <div className="flex items-center gap-3">
        <BackButton href="/home" label="Back to home" />
        <h1 className="flex-1 font-heading text-title font-bold">Reminders</h1>
        <span className="rounded-full bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground">Optional</span>
      </div>
      {error === "1" && <FormAlert>That didn&apos;t work. Please try again.</FormAlert>}

      <SettingsForm settings={settings ?? { appointments: true, refills: true, labs: true }} />

      <h2 className="font-heading text-[17px] font-bold">Coming up</h2>
      {(reminders ?? []).length === 0 && <p className="text-sm text-muted-foreground">No upcoming reminders.</p>}
      {(reminders ?? []).map((r) => (
        <article key={r.id} className="flex flex-wrap items-center gap-3 rounded-tile border border-border bg-card p-3.5">
          <span className="flex w-12 flex-col items-center rounded-field bg-primary-soft py-1.5 text-primary-deep">
            <span className="text-[11px] font-bold uppercase">{manila(r.due_at, { month: "short" })}</span>
            <strong className="font-heading text-lg leading-none">{manila(r.due_at, { day: "2-digit" })}</strong>
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <strong className="text-ui">
              {KIND_LABEL[r.kind]} · {r.title}
            </strong>
            <span className="text-caption text-muted-foreground">
              {timeOfDay(r.due_at)}
              {r.note && ` · ${r.note}`}
            </span>
          </span>
          <EditReminder
            reminder={{ id: r.id, kind: r.kind, title: r.title, note: r.note, due_local: localInput(r.due_at) }}
          />
          <form action={deleteReminder}>
            <input type="hidden" name="id" value={r.id} />
            <button type="submit" className="min-h-11 px-2 text-sm font-semibold text-danger-foreground">
              Delete
            </button>
          </form>
        </article>
      ))}

      {active ? (
        <details className="rounded-tile border border-border bg-card p-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-primary">Add a reminder</summary>
          <div className="pt-3">
            <ReminderForm />
          </div>
        </details>
      ) : (
        <p className="text-sm text-muted-foreground">Reminders open once your account is linked to a patient.</p>
      )}
    </main>
  );
}

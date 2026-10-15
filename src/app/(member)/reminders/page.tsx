import { FormAlert } from "@/components/ui/form-alert";
import { PatientSwitcher } from "@/components/patient-switcher";
import { BackButton } from "@/components/ui/page-header";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";
import { createClient } from "@/lib/supabase/server";
import { dayTwoDigit, manilaInputValue, monthShort, timeOfDay } from "@/lib/dates";
import { deleteReminder } from "./actions";
import { EditReminder, ReminderForm, SettingsForm } from "./forms";

export const metadata = { title: "Reminders · CareFolio" };

const KIND_LABEL: Record<string, string> = { appointment: "Check-up", refill: "Refill", lab: "Lab test" };
/** Keep showing a reminder for an hour after it was due. */
function anHourAgo() {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString();
}

// design/MReminders.html
export default async function RemindersPage({ searchParams }: PageProps<"/reminders">) {
  await requireMember();
  const { error } = await searchParams;
  const { patients, active } = await getActivePatient();
  const supabase = await createClient();
  const [{ data: settings }, { data: reminders }] = await Promise.all([
    supabase.from("reminder_settings").select("appointments, refills, labs").maybeSingle(),
    // Only the patient being viewed (switch patient to see others).
    active
      ? supabase
          .from("reminders")
          .select("id, kind, title, note, due_at, enabled")
          .eq("patient_id", active.id)
          .gte("due_at", anHourAgo())
          .order("due_at")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <main className="flex flex-col gap-4 px-5 pt-5 pb-6 md:max-w-2xl md:px-10 md:py-8">
      <div className="flex items-center gap-3">
        <BackButton href="/home" label="Back to home" />
        <h1 className="flex-1 font-heading text-title font-bold">Reminders</h1>
        <span className="rounded-full bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground">Optional</span>
      </div>
      {active && <PatientSwitcher patients={patients} activeId={active.id} />}
      {error === "1" && <FormAlert>That didn&apos;t work. Please try again.</FormAlert>}

      <SettingsForm settings={settings ?? { appointments: true, refills: true, labs: true }} />

      <h2 className="font-heading text-subtitle font-bold">Coming up</h2>
      {(reminders ?? []).length === 0 && <p className="text-sm text-muted-foreground">No upcoming reminders.</p>}
      {(reminders ?? []).map((r) => (
        <article key={r.id} className="flex flex-wrap items-center gap-3 rounded-tile border border-border bg-card p-3.5">
          <span className="flex w-12 flex-col items-center rounded-field bg-primary-soft py-1.5 text-primary-deep">
            <span className="text-tiny font-bold uppercase">{monthShort(r.due_at)}</span>
            <strong className="font-heading text-lg leading-none">{dayTwoDigit(r.due_at)}</strong>
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
            reminder={{ id: r.id, kind: r.kind, title: r.title, note: r.note, due_local: manilaInputValue(r.due_at) }}
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

"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addReminder, editReminder, saveReminderSettings, type ReminderState } from "./actions";

const KINDS = [
  { value: "appointment", label: "Appointment" },
  { value: "refill", label: "Refill" },
  { value: "lab", label: "Lab test" },
];
const SELECT =
  "h-12 rounded-field border-[1.5px] border-input bg-card px-3 text-ui focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none";

/** The three on/off switches; changing one saves straight away. */
export function SettingsForm({
  settings,
}: {
  settings: { appointments: boolean; refills: boolean; labs: boolean };
}) {
  const rows = [
    { name: "appointments", label: "Appointments", hint: "A heads-up the day before", on: settings.appointments },
    { name: "refills", label: "Medicine refills", hint: "Before your supply runs out", on: settings.refills },
    { name: "labs", label: "Lab tests", hint: "Before a scheduled test", on: settings.labs },
  ];
  return (
    <form action={saveReminderSettings} className="flex flex-col overflow-hidden rounded-tile border border-border bg-card">
      {rows.map((r, i) => (
        <label
          key={r.name}
          className={`flex min-h-14 cursor-pointer items-center gap-3 px-3.5 py-2.5 ${i < rows.length - 1 ? "border-b border-divider" : ""}`}
        >
          <span className="flex flex-1 flex-col">
            <strong className="text-ui">{r.label}</strong>
            <span className="text-caption text-muted-foreground">{r.hint}</span>
          </span>
          <input
            type="checkbox"
            name={r.name}
            defaultChecked={r.on}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="size-[22px] accent-primary"
          />
        </label>
      ))}
      <noscript>
        <button type="submit">Save</button>
      </noscript>
    </form>
  );
}

type Reminder = { id: string; kind: string; title: string; note: string | null; due_local: string };

/** Add a reminder, or edit one (when `reminder` is given). */
export function ReminderForm({ reminder, onDone }: { reminder?: Reminder; onDone?: () => void }) {
  const [state, action, pending] = useActionState<ReminderState, FormData>(
    async (prev, form) => {
      const result = await (reminder ? editReminder : addReminder)(prev, form);
      if (result.ok) onDone?.();
      return result;
    },
    {},
  );
  const id = reminder?.id ?? "new";
  return (
    <form action={action} className="flex flex-col gap-3">
      {reminder && <input type="hidden" name="id" value={reminder.id} />}
      <FormAlert>{state.error}</FormAlert>
      {state.ok && !reminder && <FormAlert tone="info">Reminder added.</FormAlert>}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`kind-${id}`}>Type</Label>
          <select id={`kind-${id}`} name="kind" defaultValue={reminder?.kind ?? "appointment"} className={SELECT}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`due-${id}`}>When</Label>
          <input id={`due-${id}`} name="due" type="datetime-local" defaultValue={reminder?.due_local} required className={SELECT} />
        </div>
      </div>
      <InputField id={`title-${id}`} name="title" label="Title" defaultValue={reminder?.title} placeholder="e.g. Check-up · Dr. Reyes" required />
      <InputField id={`note-${id}`} name="note" label="Note (optional)" defaultValue={reminder?.note ?? ""} placeholder="e.g. Fasting not required" />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : reminder ? "Save changes" : "Add reminder"}
      </Button>
    </form>
  );
}

export function EditReminder({ reminder }: { reminder: Reminder }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="w-full pt-2">
      <ReminderForm reminder={reminder} onDone={() => setOpen(false)} />
    </div>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="min-h-11 px-2 text-sm font-semibold text-primary">
      Edit
    </button>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DOC_TYPES, PURPOSES, type DocType } from "@/lib/records";
import { createWalkIn, type WalkInState } from "./walk-in-actions";

const SELECT =
  "h-12 w-full min-w-0 rounded-field border-[1.5px] border-input bg-card px-3 text-ui focus-visible:border-primary focus-visible:outline-none";

/** "New walk-in request": someone at the counter, logged by staff. */
export function WalkInForm({ patients }: { patients: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [filter, setFilter] = useState("");
  const [state, action, pending] = useActionState<WalkInState, FormData>(createWalkIn, {});
  const shown = patients.filter((p) => p.label.toLowerCase().includes(filter.toLowerCase()));

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="self-start">
        + New walk-in request
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
      <h2 className="font-heading text-lg font-bold">New walk-in request</h2>
      {state.ok && <FormAlert tone="info">{state.ok}</FormAlert>}
      <FormAlert>{state.error}</FormAlert>
      <div className="grid gap-2.5 md:grid-cols-2">
        <InputField id="wi-search" label="Search patient" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Name or hospital no." autoComplete="off" />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wi-patient">Patient</Label>
          <select id="wi-patient" name="patient_id" required className={SELECT}>
            {shown.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <InputField id="wi-name" name="walk_in_name" label="Walk-in person's name (as on their ID)" required />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wi-type">Document</Label>
          <select id="wi-type" name="doc_type" className={SELECT}>
            {(Object.keys(DOC_TYPES) as DocType[]).map((t) => <option key={t} value={t}>{DOC_TYPES[t]}</option>)}
          </select>
        </div>
        <InputField id="wi-detail" name="detail" label="Which test or date?" required />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wi-purpose">Purpose</Label>
          <select id="wi-purpose" name="purpose" className={SELECT}>
            {PURPOSES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" name="is_urgent" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="size-5 accent-accent" />
        Urgent (same day)
      </label>
      {urgent && <Textarea name="urgent_reason" aria-label="Why is it urgent?" placeholder="Why is it urgent?" rows={2} />}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add to queue"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
      </div>
    </form>
  );
}

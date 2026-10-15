"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DOC_TYPES, type DocType } from "@/lib/records";
import { addDocument, saveEntry, updateDocument, type EntryState } from "./actions";
import type { FieldDef } from "./record-tables";

/** Add or edit one medication / allergy / diagnosis / lab value. */
export function EntryForm({
  table,
  patientId,
  fields,
  entry,
  onDone,
}: {
  table: string;
  patientId: string;
  fields: readonly FieldDef[];
  entry?: Record<string, string | null> & { id: string };
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<EntryState, FormData>(async (prev, form) => {
    const result = await saveEntry(prev, form);
    if (result.ok) onDone?.();
    return result;
  }, {});
  const key = entry?.id ?? "new";
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="patient_id" value={patientId} />
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
        {fields.map((f) => (
          <InputField
            key={f.name}
            id={`${f.name}-${key}`}
            name={f.name}
            label={f.label}
            defaultValue={entry?.[f.name] ?? ""}
            required={f.required}
          />
        ))}
        <InputField id={`record_date-${key}`} name="record_date" type="date" label="Date" defaultValue={entry?.record_date ?? ""} required />
        <InputField id={`source-${key}`} name="source" label="Source" defaultValue={entry?.source ?? ""} placeholder="Facility / lab" />
      </div>
      <FormAlert>{state.error}</FormAlert>
      {state.ok && !entry && <FormAlert tone="info">Saved and logged.</FormAlert>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save · logged"}
      </Button>
    </form>
  );
}

/** "Edit" that opens an inline form for one row. */
export function EditEntry(props: {
  table: string;
  patientId: string;
  fields: readonly FieldDef[];
  entry: Record<string, string | null> & { id: string };
}) {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="w-full rounded-field bg-background p-3">
      <EntryForm {...props} onDone={() => setOpen(false)} />
    </div>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="min-h-11 px-2 text-sm font-semibold text-primary">
      Edit
    </button>
  );
}

export function EditDocument(props: {
  patientId: string;
  doc: { id: string; title: string; doctor: string | null; record_date: string };
}) {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="w-full rounded-field bg-background p-3">
      <EditDocumentForm {...props} onDone={() => setOpen(false)} />
    </div>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="min-h-11 px-2 text-sm font-semibold text-primary">
      Edit
    </button>
  );
}

export function AddDocumentForm({ patientId }: { patientId: string }) {
  const [state, action, pending] = useActionState<EntryState, FormData>(addDocument, {});
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="patient_id" value={patientId} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <select id="type" name="type" className="h-12 rounded-field border-[1.5px] border-input bg-card px-3 text-ui">
            {(Object.keys(DOC_TYPES) as DocType[]).map((t) => (
              <option key={t} value={t}>{DOC_TYPES[t]}</option>
            ))}
          </select>
        </div>
        <InputField id="doc-title" name="title" label="Title" required />
        <InputField id="doc-doctor" name="doctor" label="Doctor" />
        <InputField id="doc-date" name="record_date" type="date" label="Record date" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="doc-file">PDF <span className="font-normal text-muted-foreground">(4 MB max · stamped with a verification code)</span></Label>
        <input id="doc-file" name="file" type="file" accept="application/pdf" required className="text-sm" />
      </div>
      <FormAlert>{state.error}</FormAlert>
      {state.ok && <FormAlert tone="info">Document added, stamped and released to the patient.</FormAlert>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Uploading…" : "Upload document · logged"}
      </Button>
    </form>
  );
}

export function EditDocumentForm({
  patientId,
  doc,
  onDone,
}: {
  patientId: string;
  doc: { id: string; title: string; doctor: string | null; record_date: string };
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<EntryState, FormData>(async (prev, form) => {
    const result = await updateDocument(prev, form);
    if (result.ok) onDone();
    return result;
  }, {});
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="id" value={doc.id} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
        <InputField id={`t-${doc.id}`} name="title" label="Title" defaultValue={doc.title} required />
        <InputField id={`d-${doc.id}`} name="doctor" label="Doctor" defaultValue={doc.doctor ?? ""} />
        <InputField id={`r-${doc.id}`} name="record_date" type="date" label="Record date" defaultValue={doc.record_date} required />
      </div>
      <FormAlert>{state.error}</FormAlert>
      <Button type="submit" disabled={pending} className="self-start">Save · logged</Button>
    </form>
  );
}

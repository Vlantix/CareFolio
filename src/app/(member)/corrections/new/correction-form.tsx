"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendCorrection, type CorrectionState } from "./actions";

const KINDS = [
  { value: "wrong_value", label: "A value or detail is wrong" },
  { value: "missing_record", label: "A record is missing" },
  { value: "outdated_medications", label: "Medication list is outdated" },
];

export function CorrectionForm({
  documents,
  items,
  disabled,
}: {
  documents: { id: string; label: string }[];
  items: { group: string; labels: string[] }[];
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState<CorrectionState, FormData>(sendCorrection, {});
  return (
    <form action={action} className="flex flex-1 flex-col gap-4">
      <FormAlert>{state.error}</FormAlert>
      <fieldset disabled={disabled} className="flex flex-1 flex-col gap-4 disabled:opacity-60">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">What&apos;s the problem?</legend>
          {KINDS.map((k, i) => (
            <label
              key={k.value}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-field border-[1.5px] border-input bg-card px-3.5 text-ui font-semibold has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
            >
              <input type="radio" name="kind" value={k.value} defaultChecked={i === 0} className="size-[18px] accent-primary" />
              {k.label}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="record">Which record?</Label>
          <select
            id="record"
            name="record"
            className="h-12 rounded-field border-[1.5px] border-input bg-card px-3 text-ui focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            <option value="">Not a specific record</option>
            {documents.length > 0 && (
              <optgroup label="Documents">
                {documents.map((d) => (
                  <option key={d.id} value={`doc:${d.id}`}>{d.label}</option>
                ))}
              </optgroup>
            )}
            {items.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.labels.map((l) => (
                  <option key={l} value={`item:${g.group}: ${l}`}>{l}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="details">Details</Label>
          <Textarea
            id="details"
            name="details"
            rows={4}
            maxLength={2000}
            placeholder="e.g. Allergy listed as penicillin, but it should be sulfa drugs."
          />
        </div>
        <div className="flex items-start gap-3 rounded-field bg-primary-soft p-3.5 text-sm text-primary-deep">
          <ShieldCheck size={20} aria-hidden className="mt-px shrink-0" />
          Any change is made by the records office and saved in the audit trail. You&apos;ll be
          notified of the result.
        </div>
        <div className="grow" />
        <Button type="submit" size="lg" disabled={pending || disabled}>
          {pending ? "Sending…" : "Send to records office"}
        </Button>
      </fieldset>
    </form>
  );
}

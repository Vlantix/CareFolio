"use client";

import { useActionState, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DOC_TYPES, PURPOSES, expectedRelease, shortDate, type DocType } from "@/lib/records";
import { requestSchema } from "@/lib/request-schema";
import { fieldErrors, formToObject } from "@/lib/validation";
import { createRequest, type NewRequestState } from "../actions";

const SELECT =
  "h-12 w-full min-w-0 rounded-field border-[1.5px] border-input bg-card px-2.5 text-[15px] text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none";

export function RequestForm({ facility, disabled }: { facility: string; disabled: boolean }) {
  const [state, action, pending] = useActionState<NewRequestState, FormData>(createRequest, {});
  const [local, setLocal] = useState<Record<string, string> | null>(null);
  const [docType, setDocType] = useState<DocType>("lab_result");
  const [urgent, setUrgent] = useState(false);
  const errors = local ?? state.fields ?? {};
  // Same rule as the database: 3 working days, or end of today if urgent.
  const [now] = useState(() => new Date());
  const release = expectedRelease(now, urgent);

  function check(e: React.FormEvent<HTMLFormElement>) {
    const parsed = requestSchema.safeParse(formToObject(new FormData(e.currentTarget)));
    if (!parsed.success) {
      e.preventDefault();
      setLocal(fieldErrors(parsed.error));
    } else setLocal(null);
  }

  return (
    <form action={action} onSubmit={check} noValidate className="flex flex-1 flex-col gap-4">
      <FormAlert>{state.error}</FormAlert>
      <fieldset disabled={disabled} className="flex flex-1 flex-col gap-4 disabled:opacity-60">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Document type</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DOC_TYPES) as DocType[]).map((t) => (
              <label
                key={t}
                className={cn(
                  "flex h-11 cursor-pointer items-center rounded-full px-3.5 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
                  docType === t
                    ? "border-2 border-primary bg-primary text-primary-foreground"
                    : "border-[1.5px] border-input bg-card",
                )}
              >
                <input
                  type="radio"
                  name="doc_type"
                  value={t}
                  checked={docType === t}
                  onChange={() => setDocType(t)}
                  className="sr-only"
                />
                {DOC_TYPES[t]}
              </label>
            ))}
          </div>
        </fieldset>

        <InputField
          id="detail"
          name="detail"
          label="Which test or date?"
          placeholder="e.g. HbA1c — Sept 2026"
          error={errors.detail}
        />

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="facility">Facility</Label>
            <select id="facility" className={SELECT} disabled>
              <option>{facility}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purpose">Purpose</Label>
            <select
              id="purpose"
              name="purpose"
              defaultValue=""
              aria-invalid={errors.purpose ? true : undefined}
              aria-describedby={errors.purpose ? "purpose-message" : undefined}
              className={SELECT}
            >
              <option value="" disabled>
                Choose…
              </option>
              {PURPOSES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            {errors.purpose && (
              <p id="purpose-message" className="text-[13px] font-semibold text-danger-foreground">
                {errors.purpose}
              </p>
            )}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-field border border-border bg-card px-3.5 py-3">
          <span className="flex flex-1 flex-col">
            <strong className="text-[15px]">Mark as urgent</strong>
            <span className="text-[13px] text-muted-foreground">Same-day review — a reason is required</span>
          </span>
          <input
            type="checkbox"
            name="is_urgent"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
            className="size-[22px] accent-accent"
          />
        </label>
        {urgent && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="urgent_reason">Why is it urgent?</Label>
            <Textarea
              id="urgent_reason"
              name="urgent_reason"
              placeholder="e.g. Surgery scheduled tomorrow"
              aria-invalid={errors.urgent_reason ? true : undefined}
              aria-describedby={errors.urgent_reason ? "urgent-message" : undefined}
            />
            {errors.urgent_reason && (
              <p id="urgent-message" className="text-[13px] font-semibold text-danger-foreground">
                {errors.urgent_reason}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 rounded-button bg-attention p-3.5 text-attention-foreground">
          <CalendarDays size={22} strokeWidth={1.8} aria-hidden className="shrink-0" />
          <p className="text-sm" aria-live="polite">
            <strong>Expected release: {urgent ? "today" : `by ${shortDate(release)}`}</strong>
            <br />
            {urgent ? "Urgent requests are reviewed the same day" : "3 working days after submission"}
          </p>
        </div>

        <div className="grow" />
        <Button type="submit" size="lg" disabled={pending || disabled}>
          {pending ? "Sending…" : "Submit request"}
        </Button>
      </fieldset>
    </form>
  );
}

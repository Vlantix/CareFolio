"use client";

import { ChevronDown } from "lucide-react";
import { selectPatient } from "@/app/actions/patient";
import type { PatientChoice } from "@/lib/patients";

/**
 * "Viewing Ramon Santos · Father" (design/Home.html). A real <select>,
 * so it works with a keyboard and screen readers; choosing submits.
 * Hidden when there is only one patient to view.
 */
export function PatientSwitcher({
  patients,
  activeId,
}: {
  patients: Pick<PatientChoice, "id" | "full_name" | "relationship">[];
  activeId: string;
}) {
  if (patients.length < 2) {
    const p = patients[0];
    if (!p) return null;
    return (
      <p className="flex h-12 items-center gap-2.5 rounded-field border border-border bg-card px-3.5 text-sm">
        <span className="text-muted-foreground">Viewing</span>
        <strong>
          {p.full_name}
          {p.relationship !== "You" && ` · ${p.relationship}`}
        </strong>
      </p>
    );
  }
  return (
    <form action={selectPatient}>
      <label className="relative flex h-12 items-center gap-2.5 rounded-field border border-border bg-card px-3.5 text-sm focus-within:ring-2 focus-within:ring-ring/40">
        <span className="text-muted-foreground">Viewing</span>
        <select
          name="patientId"
          defaultValue={activeId}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="min-w-0 flex-1 appearance-none bg-transparent pr-6 font-bold outline-none"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
              {p.relationship !== "You" ? ` · ${p.relationship}` : " (you)"}
            </option>
          ))}
        </select>
        <ChevronDown size={18} strokeWidth={2} aria-hidden className="pointer-events-none absolute right-3.5" />
      </label>
      <noscript>
        <button type="submit">Switch</button>
      </noscript>
    </form>
  );
}

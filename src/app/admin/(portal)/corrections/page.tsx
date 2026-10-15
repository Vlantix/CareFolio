import Link from "next/link";
import { FormAlert } from "@/components/ui/form-alert";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dayAndTime, mediumDate, shortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { resolveCorrection } from "./actions";

export const metadata = { title: "Corrections · Records office" };

const KINDS: Record<string, string> = {
  wrong_value: "Wrong value",
  missing_record: "Missing record",
  outdated_medications: "Outdated medication list",
};

// Summary-item labels look like "Medications: Metformin".
const GROUP_TABLE: Record<string, { table: string; column: string; show: string[] }> = {
  Medications: { table: "medications", column: "name", show: ["name", "dose", "schedule"] },
  "Lab values": { table: "lab_values", column: "test_name", show: ["test_name", "value", "unit"] },
  Allergies: { table: "allergies", column: "allergen", show: ["allergen", "reaction", "severity"] },
  Diagnoses: { table: "diagnoses", column: "name", show: ["name", "status"] },
};

type Row = {
  id: string;
  kind: string;
  record_label: string | null;
  details: string;
  status: string;
  created_at: string;
  patient_id: string;
  requester_id: string;
  patients: { full_name: string; profile_id: string | null } | null;
  documents: { title: string; record_date: string; verification_code: string } | null;
  profiles: { full_name: string } | null;
};

// design/ACorrections.html — list on the left, the chosen request on the right.
export default async function AdminCorrectionsPage({ searchParams }: PageProps<"/admin/corrections">) {
  await requireAdmin();
  const { error, id: rawId } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("correction_requests")
    .select("id, kind, record_label, details, status, created_at, patient_id, requester_id, patients(full_name, profile_id), documents(title, record_date, verification_code), profiles(full_name)")
    .eq("status", "open")
    .order("created_at");
  const rows = (data ?? []) as unknown as Row[];
  const selected = rows.find((r) => r.id === rawId) ?? rows[0];

  // The record as it is now, to compare with the report.
  let current: { label: string; rows: string[] } | null = null;
  let fixTab = "documents";
  if (selected?.documents) {
    const d = selected.documents;
    current = { label: "Document", rows: [`${d.title} · ${mediumDate(d.record_date)} · ${d.verification_code}`] };
  } else if (selected?.record_label) {
    const [group, ...rest] = selected.record_label.split(": ");
    const target = GROUP_TABLE[group];
    if (target) {
      fixTab = target.table;
      const { data: found } = await supabase
        .from(target.table)
        .select(target.show.join(", ") + ", record_date")
        .eq("patient_id", selected.patient_id)
        .eq(target.column, rest.join(": "));
      current = {
        label: group,
        rows: ((found ?? []) as unknown as Record<string, string | null>[]).map(
          (f) => `${target.show.map((c) => f[c]).filter(Boolean).join(" · ")} · ${shortDate(f.record_date as string)}`,
        ),
      };
    }
  }

  return (
    <main className="flex flex-col gap-5 px-5 py-6 md:px-8 md:py-8">
      <h1 className="font-heading text-[30px] font-bold tracking-[-0.02em]">Correction requests</h1>
      {error === "1" && <FormAlert>That didn&apos;t work — a note is required when rejecting.</FormAlert>}
      {rows.length === 0 && <p className="text-ui text-muted-foreground">No open correction requests.</p>}

      {selected && (
        <div className="flex flex-wrap items-start gap-5">
          <ul className="flex flex-[1_1_260px] flex-col gap-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/corrections?id=${r.id}`}
                  aria-current={r.id === selected.id ? "true" : undefined}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-tile border bg-card p-3.5 text-foreground no-underline hover:text-foreground",
                    r.id === selected.id ? "border-2 border-primary" : "border-border hover:border-primary",
                  )}
                >
                  <strong>{KINDS[r.kind] ?? r.kind}</strong>
                  <span className="text-caption text-muted-foreground">
                    {r.patients?.full_name} · from {r.patients?.profile_id === r.requester_id ? "self" : r.profiles?.full_name} ·{" "}
                    {shortDate(r.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <section className="flex flex-[2_1_420px] flex-col gap-4 rounded-card border border-border bg-card p-5">
            <h2 className="font-heading text-xl font-bold">
              {KINDS[selected.kind] ?? selected.kind} · {selected.patients?.full_name}
            </h2>
            <p className="text-sm text-muted-foreground">Sent {dayAndTime(selected.created_at)}</p>
            <p className="rounded-field bg-background px-3.5 py-3 text-ui">
              &ldquo;{selected.details}&rdquo; — {selected.profiles?.full_name}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-field border border-border p-3.5">
                <span className="text-caption font-bold tracking-[0.05em] text-muted-foreground uppercase">Current record</span>
                {current ? (
                  current.rows.length ? (
                    current.rows.map((line) => <div key={line} className="mt-1 font-semibold">{line}</div>)
                  ) : (
                    <div className="mt-1 text-muted-foreground">Not on record</div>
                  )
                ) : (
                  <div className="mt-1 text-muted-foreground">No specific record chosen</div>
                )}
              </div>
              <div className="rounded-field border-2 border-accent p-3.5">
                <span className="text-caption font-bold tracking-[0.05em] text-attention-foreground uppercase">Reported</span>
                <div className="mt-1 font-semibold">{selected.details}</div>
              </div>
            </div>

            <form action={resolveCorrection} className="flex flex-col gap-2.5">
              <input type="hidden" name="id" value={selected.id} />
              <label htmlFor="note" className="text-sm font-semibold">Note to requester</label>
              <Textarea id="note" name="note" rows={3} maxLength={500} placeholder="Required if rejecting" />
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/patients/${selected.patient_id}?tab=${fixTab}`}
                  className="flex h-11 items-center rounded-field border-[1.5px] border-primary px-4 text-sm font-bold no-underline"
                >
                  Fix record
                </Link>
                <button type="submit" name="status" value="fixed" className="h-11 rounded-field bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
                  Mark corrected
                </button>
                <button type="submit" name="status" value="rejected" className="h-11 rounded-field border-[1.5px] border-attention-icon bg-card px-4 text-sm font-bold text-attention-foreground hover:bg-attention">
                  Reject with note
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

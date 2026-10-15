import { FormAlert } from "@/components/ui/form-alert";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dayAndTime } from "@/lib/dates";
import { resolveCorrection } from "./actions";

export const metadata = { title: "Corrections · Records office" };

const KINDS: Record<string, string> = {
  wrong_value: "A value or detail is wrong",
  missing_record: "A record is missing",
  outdated_medications: "Medication list is outdated",
};

// A simple list until the full admin screens (design/ACorrections.html)
// arrive in phase 7. Fixing the record itself is done separately; this
// records the outcome and notifies the requester.
export default async function AdminCorrectionsPage({ searchParams }: PageProps<"/admin/corrections">) {
  await requireAdmin();
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("correction_requests")
    .select("id, kind, record_label, details, status, created_at, patients(full_name, hospital_no), documents(title), profiles(full_name)")
    .eq("status", "open")
    .order("created_at");
  const rows = data ?? [];

  return (
    <main className="flex flex-col gap-4 px-5 py-6 md:max-w-3xl md:px-10 md:py-8">
      <h1 className="font-heading text-[30px] font-bold tracking-[-0.02em]">Correction requests</h1>
      {error === "1" && <FormAlert>That didn&apos;t work. Please try again.</FormAlert>}
      {rows.length === 0 && <p className="text-ui text-muted-foreground">No open correction requests.</p>}
      {rows.map((c) => {
        const patient = c.patients as unknown as { full_name: string; hospital_no: string } | null;
        const doc = c.documents as unknown as { title: string } | null;
        const by = c.profiles as unknown as { full_name: string } | null;
        return (
          <article key={c.id} className="flex flex-col gap-3 rounded-tile border border-border bg-card p-4">
            <div className="flex flex-col gap-0.75">
              <strong className="text-ui">
                {patient?.full_name} · {patient?.hospital_no}
              </strong>
              <span className="text-caption text-muted-foreground">
                {KINDS[c.kind] ?? c.kind} · {doc?.title ?? c.record_label ?? "General"} · from {by?.full_name} ·{" "}
                {dayAndTime(c.created_at)}
              </span>
            </div>
            <p className="rounded-chip bg-background px-3 py-2.5 text-sm">{c.details}</p>
            <form action={resolveCorrection} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={c.id} />
              <label htmlFor={`note-${c.id}`} className="text-sm font-semibold">Note to the requester (optional)</label>
              <Textarea id={`note-${c.id}`} name="note" rows={2} maxLength={500} />
              <div className="flex flex-wrap gap-2">
                <button type="submit" name="status" value="fixed" className="h-11 rounded-field bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
                  Mark corrected
                </button>
                <button type="submit" name="status" value="rejected" className="h-11 rounded-field border-[1.5px] border-input bg-card px-4 text-sm font-semibold hover:bg-danger hover:text-danger-foreground">
                  No change needed
                </button>
              </div>
            </form>
          </article>
        );
      })}
    </main>
  );
}

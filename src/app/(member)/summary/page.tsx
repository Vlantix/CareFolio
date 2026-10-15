import Link from "next/link";
import { Lock } from "lucide-react";
import { PatientSwitcher } from "@/components/patient-switcher";
import { BackButton } from "@/components/ui/page-header";
import { Logo } from "@/components/ui/logo";
import { ProtectedView } from "@/components/protected-view";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";
import { createClient } from "@/lib/supabase/server";
import { maskEmail } from "@/lib/device";
import { latestPerTest, shortDate } from "@/lib/records";
import { printedAt } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata = { title: "Health summary · CareFolio" };

function age(birthdate: string | null) {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) years--;
  return years;
}

const SECTION = "flex flex-col rounded-tile border border-border bg-card px-3.5 py-3";
const HEADING = "mb-1 text-caption font-bold tracking-[0.05em] text-muted-foreground uppercase";

// design/MSummary.html — read-only, from facility records.
export default async function SummaryPage() {
  const profile = await requireMember();
  const { patients, active } = await getActivePatient();

  if (!active) {
    return (
      <main className="flex flex-col gap-4 px-5 pt-5 pb-6 md:px-10 md:py-8">
        <div className="flex items-center gap-3">
          <BackButton href="/home" label="Back to home" />
          <h1 className="font-heading text-title font-bold">Health summary</h1>
        </div>
        <p className="text-ui text-muted-foreground">No patient linked yet.</p>
      </main>
    );
  }

  const supabase = await createClient();
  const [allergies, meds, diagnoses, labs] = await Promise.all([
    supabase.from("allergies").select("id, allergen, reaction, severity, record_date, source").eq("patient_id", active.id),
    supabase.from("medications").select("id, name, dose, schedule, record_date, source").eq("patient_id", active.id).order("record_date", { ascending: false }),
    supabase.from("diagnoses").select("id, name, status, record_date, source").eq("patient_id", active.id).order("record_date", { ascending: false }),
    supabase.from("lab_values").select("id, test_name, value, unit, record_date, source").eq("patient_id", active.id).order("record_date", { ascending: false }),
  ]);
  const allDates = [allergies, meds, diagnoses, labs].flatMap((r) => (r.data ?? []).map((x) => x.record_date as string));
  const updated = allDates.sort().at(-1);
  const years = age(active.birthdate);
  const printed = printedAt(new Date());
  const latestLabs = latestPerTest(labs.data ?? []);

  return (
    <main className="flex flex-col gap-3.5 px-5 pt-5 pb-6 md:max-w-3xl md:px-10 md:py-8 print:p-0">
      <div className="flex items-center gap-3 print:hidden">
        <BackButton href="/home" label="Back to home" />
        <h1 className="flex-1 font-heading text-title font-bold">Health summary</h1>
        <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1.25 text-xs font-bold text-primary-deep">
          <Lock size={12} aria-hidden /> Read-only, from facility records
        </span>
      </div>

      <div className="print:hidden">
        <PatientSwitcher patients={patients} activeId={active.id} />
      </div>

      <ProtectedView
        viewerName={profile.full_name}
        viewerEmail={maskEmail(profile.email)}
        patientId={active.id}
        className="print:break-inside-avoid"
      >
        <div className="flex flex-col gap-3.5 bg-background print:gap-2">
          {/* Only on paper: CareFolio header + printed date. */}
          <div className="hidden items-center justify-between border-b border-border pb-2 print:flex">
            <Logo />
            <span className="text-xs text-muted-foreground">Printed {printed} · Read-only, from facility records</span>
          </div>

          <div className="flex flex-col gap-1 rounded-card bg-foreground p-4 text-primary-foreground">
            <strong className="font-heading text-xl">{active.full_name}</strong>
            <span className="text-sm text-sidebar-foreground">
              {[years !== null && `${years} yrs`, active.sex, `Hospital no. ${active.hospital_no}`].filter(Boolean).join(" · ")}
            </span>
            {updated && (
              <span className="text-xs text-sidebar-foreground">From facility records · updated {shortDate(updated)}</span>
            )}
          </div>

          <section className={cn(SECTION, "border-2 border-accent")}>
            <h2 className={cn(HEADING, "text-attention-foreground")}>Allergies</h2>
            {(allergies.data ?? []).length === 0 && <span className="text-sm">No known allergies on record.</span>}
            {(allergies.data ?? []).map((a) => (
              <div key={a.id} className="flex flex-wrap justify-between gap-2 py-1 text-ui">
                <strong>
                  {a.allergen}
                  {a.reaction && ` — ${a.reaction}`}
                  {a.severity && ` (${a.severity})`}
                </strong>
                <span className="text-xs text-muted-foreground">{shortDate(a.record_date)} · {a.source}</span>
              </div>
            ))}
          </section>

          <section className={SECTION}>
            <h2 className={HEADING}>Current medications</h2>
            {(meds.data ?? []).length === 0 && <span className="py-1 text-sm">None on record.</span>}
            {(meds.data ?? []).map((m, i, arr) => (
              <div key={m.id} className={cn("flex flex-wrap justify-between gap-2 py-2 text-sm", i < arr.length - 1 && "border-b border-divider")}>
                <strong>{m.name}</strong>
                <span className="text-muted-foreground">
                  {[m.dose, m.schedule].filter(Boolean).join(" · ")} · {shortDate(m.record_date)} · {m.source}
                </span>
              </div>
            ))}
          </section>

          <section className={cn(SECTION, "gap-2")}>
            <h2 className={HEADING}>Diagnoses</h2>
            {(diagnoses.data ?? []).length === 0 && <span className="text-sm">None on record.</span>}
            <div className="flex flex-wrap gap-1.5">
              {(diagnoses.data ?? []).map((d) => (
                <span key={d.id} className="rounded-lg bg-background px-2.5 py-1.5 text-caption font-semibold">
                  {d.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {shortDate(d.record_date)} · {d.source}
                  </span>
                </span>
              ))}
            </div>
          </section>

          <section className={SECTION}>
            <h2 className={HEADING}>Latest lab values</h2>
            {latestLabs.length === 0 && <span className="py-1 text-sm">None on record.</span>}
            {latestLabs.map((l, i, arr) => (
              <div key={l.id} className={cn("flex flex-wrap justify-between gap-2 py-2 text-sm", i < arr.length - 1 && "border-b border-divider")}>
                <strong>{l.test_name}</strong>
                <span className="text-muted-foreground">
                  {l.value}{l.unit ? ` ${l.unit}` : ""} · {shortDate(l.record_date)} · {l.source}
                </span>
              </div>
            ))}
          </section>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5 print:hidden">
          <PrintButton />
          <Link
            href="/share"
            className="flex h-13 items-center justify-center rounded-button bg-primary font-semibold text-primary-foreground no-underline hover:bg-primary-hover hover:text-primary-foreground"
          >
            Share via QR
          </Link>
        </div>
      </ProtectedView>
    </main>
  );
}

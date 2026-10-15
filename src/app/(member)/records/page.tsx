import Link from "next/link";
import { Search } from "lucide-react";
import { PatientSwitcher } from "@/components/patient-switcher";
import { BackButton } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";
import { createClient } from "@/lib/supabase/server";
import { DOC_TYPES, shortDate, type DocType } from "@/lib/records";
import type { DocumentRow } from "@/lib/documents";
import { monthYear } from "@/lib/dates";

export const metadata = { title: "Records · CareFolio" };

const FIELD =
  "h-11 min-w-0 rounded-full border-[1.5px] border-input bg-card px-3.5 text-caption font-semibold text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none";

const monthLabel = (date: string) => monthYear(date);

// design/MRecords.html
export default async function RecordsPage({ searchParams }: PageProps<"/records">) {
  await requireMember();
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const q = one("q").trim().toLowerCase();
  const type = one("type");
  const from = one("from");
  const to = one("to");
  const doctor = one("doctor");
  const facility = one("facility");

  const { patients, active } = await getActivePatient();
  const supabase = await createClient();
  const { data } = active
    ? await supabase
        .from("documents")
        .select("id, patient_id, type, title, facility, doctor, record_date, file_path, verification_code")
        .eq("patient_id", active.id)
        .order("record_date", { ascending: false })
    : { data: [] };
  const all = (data ?? []) as DocumentRow[];

  // Filters run here on the server (the list per patient is small). No
  // user text is ever pasted into a database query.
  const docs = all.filter(
    (d) =>
      (!q || [d.title, d.doctor ?? "", d.facility, d.verification_code].some((v) => v.toLowerCase().includes(q))) &&
      (!type || d.type === type) &&
      (!from || d.record_date >= from) &&
      (!to || d.record_date <= to) &&
      (!doctor || d.doctor === doctor) &&
      (!facility || d.facility === facility),
  );
  const doctors = [...new Set(all.map((d) => d.doctor).filter(Boolean))] as string[];
  const facilities = [...new Set(all.map((d) => d.facility))];
  const months = [...new Set(docs.map((d) => monthLabel(d.record_date)))];

  return (
    <main className="flex flex-col gap-3.5 px-5 pt-5 pb-6 md:max-w-3xl md:px-10 md:py-8">
      <div className="flex items-center gap-3">
        <BackButton href="/home" label="Back to home" />
        <h1 className="font-heading text-title font-bold">Records</h1>
      </div>

      {active && <PatientSwitcher patients={patients} activeId={active.id} />}

      {/* A plain GET form: filters live in the address, so Back works. */}
      <form className="flex flex-col gap-2.5" role="search">
        <div className="flex h-12 items-center gap-2.5 rounded-field border-[1.5px] border-input bg-card px-3.5 focus-within:border-primary">
          <Search size={18} aria-hidden className="text-muted-foreground" />
          <label htmlFor="q" className="sr-only">Search records</label>
          <input
            id="q"
            name="q"
            defaultValue={one("q")}
            placeholder="Search records"
            className="min-w-0 flex-1 bg-transparent text-base outline-none"
          />
        </div>
        <details className="group" open={!!(type || from || to || doctor || facility)}>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary">
            Filters
          </summary>
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="type" className="text-xs">Type</Label>
              <select id="type" name="type" defaultValue={type} className={FIELD}>
                <option value="">All</option>
                {(Object.keys(DOC_TYPES) as DocType[]).map((t) => (
                  <option key={t} value={t}>{DOC_TYPES[t]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="doctor" className="text-xs">Doctor</Label>
              <select id="doctor" name="doctor" defaultValue={doctor} className={FIELD}>
                <option value="">All</option>
                {doctors.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="facility" className="text-xs">Facility</Label>
              <select id="facility" name="facility" defaultValue={facility} className={FIELD}>
                <option value="">All</option>
                {facilities.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="from" className="text-xs">From</Label>
              <input id="from" name="from" type="date" defaultValue={from} className={FIELD} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="to" className="text-xs">To</Label>
              <input id="to" name="to" type="date" defaultValue={to} className={FIELD} />
            </div>
          </div>
        </details>
        <div className="flex gap-2">
          <Button type="submit" size="sm">Apply</Button>
          <Link href="/records" className="flex h-11 items-center px-3 text-sm font-semibold">Clear</Link>
        </div>
      </form>

      {!active && <p className="text-ui text-muted-foreground">No patient linked yet.</p>}
      {active && docs.length === 0 && (
        <p className="text-ui text-muted-foreground">
          {all.length === 0 ? "No released documents yet." : "No records match these filters."}
        </p>
      )}

      {months.map((m) => {
        const inMonth = docs.filter((d) => monthLabel(d.record_date) === m);
        return (
          <section key={m} className="flex flex-col gap-3">
            <h2 className="mt-1 text-caption font-bold tracking-[0.05em] text-muted-foreground uppercase">{m}</h2>
            {inMonth.map((d, i) => (
              <div key={d.id} className="flex gap-3">
                <div className="flex w-3.5 flex-col items-center" aria-hidden>
                  <span className="mt-4.5 size-3 rounded-full bg-primary" />
                  {i < inMonth.length - 1 && <span className="w-0.5 flex-1 bg-border" />}
                </div>
                <article className="flex flex-1 flex-col gap-2 rounded-tile border border-border bg-card p-3.5">
                  <div className="flex justify-between gap-2">
                    <strong className="text-ui">{d.title}</strong>
                    <span className="text-xs text-muted-foreground">{shortDate(d.record_date)}</span>
                  </div>
                  <span className="text-caption text-muted-foreground">
                    {[d.doctor, d.facility].filter(Boolean).join(" · ")}
                  </span>
                  <span className="text-xs font-semibold text-primary-deep">
                    Verification code {d.verification_code}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/records/${d.id}`}
                      className="flex h-11 flex-1 items-center justify-center rounded-chip bg-primary-soft text-sm font-bold text-primary-deep no-underline hover:text-primary-deep"
                    >
                      View
                    </Link>
                    <a
                      href={`/api/documents/${d.id}/download`}
                      className="flex h-11 flex-1 items-center justify-center rounded-chip bg-primary text-sm font-bold text-primary-foreground no-underline hover:bg-primary-hover hover:text-primary-foreground"
                    >
                      Download PDF
                    </a>
                  </div>
                </article>
              </div>
            ))}
          </section>
        );
      })}
    </main>
  );
}

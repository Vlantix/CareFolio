import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageFrom, mediumDate, shortDate } from "@/lib/dates";
import { DOC_TYPES, type DocType } from "@/lib/records";
import { cn } from "@/lib/utils";
import { RECORD_TABLES, isRecordTable, type RecordTable } from "../record-tables";
import { removeEntry, withdrawDocument } from "../actions";
import { AddDocumentForm, EditDocument, EditEntry, EntryForm } from "../entry-forms";

export const metadata = { title: "Patient record · Records office" };

const TABS = ["documents", ...Object.keys(RECORD_TABLES)] as const;
type Tab = (typeof TABS)[number];
const tabLabel = (t: Tab) => (t === "documents" ? "Documents" : RECORD_TABLES[t as RecordTable].tab);

type Entry = Record<string, string | null> & { id: string; record_date: string; source: string; updated_at: string; updated_by: string | null };

// design/ARecords.html — staff add, edit and remove; every change is logged.
export default async function PatientRecordPage({ params, searchParams }: PageProps<"/admin/patients/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { tab: rawTab } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(String(rawTab)) ? (rawTab as Tab) : "documents";

  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, hospital_no, birthdate, sex")
    .eq("id", id)
    .maybeSingle();
  if (!patient) notFound();

  // Newest change across the health tables, and who made it.
  const latest = await Promise.all(
    (Object.keys(RECORD_TABLES) as RecordTable[]).map((t) =>
      supabase.from(t).select("updated_at, updated_by").eq("patient_id", id).order("updated_at", { ascending: false }).limit(1),
    ),
  );
  const last = latest
    .flatMap((r) => r.data ?? [])
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

  const rows: Entry[] = isRecordTable(tab)
    ? (((await supabase.from(tab).select("*").eq("patient_id", id).order("record_date", { ascending: false })).data ??
        []) as Entry[])
    : [];
  const { data: docs } =
    tab === "documents"
      ? await supabase
          .from("documents")
          .select("id, type, title, doctor, record_date, verification_code, released_at")
          .eq("patient_id", id)
          .order("record_date", { ascending: false })
      : { data: [] };

  const editorIds = [...new Set([last?.updated_by, ...rows.map((r) => r.updated_by)].filter(Boolean))] as string[];
  const { data: editors } = editorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", editorIds)
    : { data: [] };
  const nameOf = (uid: string | null) => editors?.find((e) => e.id === uid)?.full_name ?? "—";
  const years = ageFrom(patient.birthdate);

  return (
    <main className="flex flex-col gap-5 px-5 py-6 md:px-8 md:py-8">
      <Link href="/admin/patients" className="text-sm font-semibold">← All patients</Link>
      <div>
        <h1 className="font-heading text-[30px] font-bold tracking-[-0.02em]">{patient.full_name}</h1>
        <p className="mt-1 text-muted-foreground">
          Hospital no. {patient.hospital_no}
          {years !== null && ` · ${years} yrs`}
          {last && ` · Last updated ${mediumDate(last.updated_at)} by ${nameOf(last.updated_by)}`}
        </p>
      </div>

      <nav aria-label="Record sections" className="flex flex-wrap gap-1.5 rounded-field bg-tab-track p-1">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/patients/${id}?tab=${t}`}
            aria-current={t === tab ? "page" : undefined}
            className={cn(
              "flex h-10 flex-1 items-center justify-center rounded-[9px] px-3 text-sm whitespace-nowrap no-underline",
              t === tab ? "bg-card font-bold text-foreground hover:text-foreground" : "font-semibold text-muted-foreground hover:text-foreground",
            )}
          >
            {tabLabel(t)}
          </Link>
        ))}
      </nav>

      {tab === "documents" ? (
        <>
          <section className="flex flex-col gap-2.5">
            {(docs ?? []).length === 0 && <p className="text-muted-foreground">No documents yet.</p>}
            {(docs ?? []).map((d) => (
              <article key={d.id} className="flex flex-wrap items-center gap-3 rounded-tile border border-border bg-card p-3.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong>{d.title}</strong>
                  <span className="text-caption text-muted-foreground">
                    {DOC_TYPES[d.type as DocType]} · {shortDate(d.record_date)} · {d.verification_code} ·{" "}
                    {d.released_at ? `released ${mediumDate(d.released_at)}` : "withdrawn"}
                  </span>
                </span>
                <EditDocument patientId={id} doc={d} />
                {d.released_at && (
                  <form action={withdrawDocument}>
                    <input type="hidden" name="patient_id" value={id} />
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit" className="min-h-11 px-2 text-sm font-semibold text-danger-foreground">Remove</button>
                  </form>
                )}
              </article>
            ))}
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
            <h2 className="font-heading text-lg font-bold">+ Upload document</h2>
            <AddDocumentForm patientId={id} />
          </section>
        </>
      ) : (
        isRecordTable(tab) && (
          <>
            <div className="overflow-x-auto rounded-card border border-border bg-card">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-background text-left text-caption text-muted-foreground">
                    {RECORD_TABLES[tab].fields.map((f) => (
                      <th key={f.name} className="px-4 py-3 font-semibold">{f.label}</th>
                    ))}
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-6 text-muted-foreground">Nothing on record.</td></tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-divider align-top">
                      {RECORD_TABLES[tab].fields.map((f) => (
                        <td key={f.name} className="px-4 py-3">{r[f.name] ?? "—"}</td>
                      ))}
                      <td className="px-4 py-3">{shortDate(r.record_date)}</td>
                      <td className="px-4 py-3">{r.source}</td>
                      <td className="px-4 py-3 text-caption text-muted-foreground">
                        {mediumDate(r.updated_at)} · {nameOf(r.updated_by)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <EditEntry table={tab} patientId={id} fields={RECORD_TABLES[tab].fields} entry={r} />
                          <form action={removeEntry}>
                            <input type="hidden" name="table" value={tab} />
                            <input type="hidden" name="patient_id" value={id} />
                            <input type="hidden" name="id" value={r.id} />
                            <button type="submit" className="min-h-11 px-2 text-sm font-semibold text-danger-foreground">Remove</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
              <h2 className="font-heading text-lg font-bold">Add entry</h2>
              <EntryForm table={tab} patientId={id} fields={RECORD_TABLES[tab].fields} />
              <p className="text-caption text-muted-foreground">
                Only admins can change records. Every edit and removal is recorded in the audit trail with
                your name and time.
              </p>
            </section>
          </>
        )
      )}
    </main>
  );
}

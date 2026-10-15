import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadAudit, readFilters } from "@/lib/audit";
import { dayAndTime } from "@/lib/dates";

export const metadata = { title: "Audit trail · Records office" };

const FIELD =
  "h-11 min-w-0 rounded-field border-[1.5px] border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none";

// design/AAudit.html — read-only. Nobody can edit or delete entries.
export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin();
  const params = await searchParams;
  const f = readFilters(params);
  const supabase = await createClient();
  const [rows, { data: staff }, { data: patients }, { data: actionRows }] = await Promise.all([
    loadAudit(f, 300),
    supabase.from("profiles").select("id, full_name").eq("role", "admin").order("full_name"),
    supabase.from("patients").select("id, full_name").order("full_name"),
    supabase.from("audit_logs").select("action").order("action").limit(1000),
  ]);
  const actions = [...new Set((actionRows ?? []).map((a) => a.action))];
  const query = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();

  return (
    <main className="flex flex-col gap-5 px-5 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-[30px] font-bold tracking-[-0.02em]">Audit trail</h1>
          <p className="mt-1 text-muted-foreground">
            Every request, approval, release, record change and shared-link view. Entries can&apos;t be edited.
          </p>
        </div>
        <a
          href={`/admin/audit/export${query ? `?${query}` : ""}`}
          className="flex h-11 items-center rounded-field border-[1.5px] border-input bg-card px-4 text-sm font-semibold no-underline"
        >
          Export CSV
        </a>
      </div>

      <form className="flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-1 text-caption font-semibold">From
          <input type="date" name="from" defaultValue={f.from} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1 text-caption font-semibold">To
          <input type="date" name="to" defaultValue={f.to} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1 text-caption font-semibold">Action
          <select name="action" defaultValue={f.action} className={FIELD}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption font-semibold">Staff
          <select name="staff" defaultValue={f.staff} className={FIELD}>
            <option value="">Anyone</option>
            {(staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-caption font-semibold">Patient
          <select name="patient" defaultValue={f.patient} className={FIELD}>
            <option value="">All patients</option>
            {(patients ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </label>
        <button type="submit" className="h-11 rounded-field bg-primary px-4 text-sm font-semibold text-primary-foreground">Filter</button>
        <Link href="/admin/audit" className="flex h-11 items-center px-2 text-sm font-semibold">Clear</Link>
      </form>

      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="bg-background text-left text-caption text-muted-foreground">
              {["When", "Who", "Action", "Patient", "Details"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-muted-foreground">No entries.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-divider align-top">
                <td className="px-4 py-3 whitespace-nowrap">{dayAndTime(r.created_at)}</td>
                <td className="px-4 py-3">{r.actor}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-tab-track px-2.5 py-1 text-xs font-bold whitespace-nowrap uppercase">{r.action}</span>
                </td>
                <td className="px-4 py-3">{r.patient}</td>
                <td className="max-w-md px-4 py-3 break-words text-muted-foreground">{r.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-caption text-muted-foreground">Showing the newest 300 matching entries. Export includes up to 5,000.</p>
    </main>
  );
}

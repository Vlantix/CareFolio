import Link from "next/link";
import { LoginNotices } from "@/components/login-notices";
import { LiveBell } from "@/components/live-bell";
import { FormAlert } from "@/components/ui/form-alert";
import { WalkInForm } from "./walk-in";
import { StatusChip } from "@/components/ui/status-chip";
import { DueCell } from "@/components/due-cell";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dayKey } from "@/lib/dates";
import { DOC_TYPES, type DocType, type RequestStatus } from "@/lib/records";
import { cn } from "@/lib/utils";

export const metadata = { title: "Request queue · Records office" };

const ACTIVE: RequestStatus[] = ["submitted", "under_review", "info_requested", "approved"];
const FIELD =
  "h-11 min-w-0 rounded-field border-[1.5px] border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none";

type Row = {
  id: string;
  code: string;
  doc_type: DocType;
  detail: string;
  status: RequestStatus;
  is_urgent: boolean;
  due_at: string | null;
  requester_id: string;
  channel: "online" | "walk_in";
  walk_in_name: string | null;
  patients: { full_name: string; profile_id: string | null } | null;
  profiles: { full_name: string } | null;
};

/** Counts and "now" are worked out outside the component (render purity). */
function summarise(rows: Row[]) {
  const now = Date.now();
  const today = dayKey(new Date(now));
  return {
    now,
    dueToday: rows.filter((r) => r.due_at && dayKey(r.due_at) === today && new Date(r.due_at).getTime() >= now).length,
    overdue: rows.filter((r) => r.due_at && new Date(r.due_at).getTime() < now).length,
    urgent: rows.filter((r) => r.is_urgent).length,
  };
}

// design/AQueue.html — sorted by release deadline.
export default async function RequestQueuePage({ searchParams }: PageProps<"/admin">) {
  const me = await requireAdmin();
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const q = one("q").trim().toLowerCase();
  const status = one("status");
  const type = one("type");

  const supabase = await createClient();
  // Alerts for requests due within 4 hours or overdue (once each per staff member).
  await supabase.rpc("admin_due_alerts");
  const [{ data }, { count: pendingAccounts }, { count: unread }, { data: patientList }] = await Promise.all([
    supabase
      .from("requests")
      .select("id, code, doc_type, detail, status, is_urgent, due_at, requester_id, channel, walk_in_name, patients(full_name, profile_id), profiles(full_name)")
      .in("status", ACTIVE)
      .order("due_at", { ascending: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending").neq("role", "admin"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("patients").select("id, full_name, hospital_no").order("full_name"),
  ]);
  const all = (data ?? []) as unknown as Row[];
  const stats = summarise(all);
  // Filtering in memory: no user text is put into a database query.
  const rows = all.filter(
    (r) =>
      (!q || r.code.toLowerCase().includes(q) || (r.patients?.full_name ?? "").toLowerCase().includes(q)) &&
      (!status || r.status === status) &&
      (!type || r.doc_type === type),
  );

  const cards = [
    { label: "Due today", value: stats.dueToday },
    { label: "Overdue", value: stats.overdue, warn: stats.overdue > 0 },
    { label: "Urgent flags", value: stats.urgent, warn: stats.urgent > 0 },
    { label: "New registrations", value: pendingAccounts ?? 0, href: "/admin/accounts" },
  ];

  return (
    <main className="flex flex-col gap-5 px-5 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[30px] font-bold tracking-[-0.02em]">Request queue</h1>
          <p className="mt-1 text-muted-foreground">Sorted by release deadline · 3 working days, same day if urgent</p>
        </div>
        <LiveBell userId={me.id} initialCount={unread ?? 0} href="/admin/notifications" />
      </div>
      {typeof params.released === "string" && (
        <FormAlert tone="info">Released with code {params.released}.</FormAlert>
      )}
      <WalkInForm
        patients={(patientList ?? []).map((p) => ({ id: p.id, label: `${p.full_name} · ${p.hospital_no}` }))}
      />

      <LoginNotices devicesHref="/admin/devices" />

      <div className="flex flex-wrap gap-3.5">
        {cards.map((c) => {
          const body = (
            <>
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <span className={cn("font-heading text-4xl font-extrabold", c.warn && "text-attention-foreground")}>{c.value}</span>
            </>
          );
          return c.href ? (
            <Link
              key={c.label}
              href={c.href}
              className="flex flex-[1_1_160px] flex-col rounded-card border border-border bg-card p-4.5 text-foreground no-underline hover:border-primary hover:text-foreground"
            >
              {body}
            </Link>
          ) : (
            <div key={c.label} className="flex flex-[1_1_160px] flex-col rounded-card border border-border bg-card p-4.5">
              {body}
            </div>
          );
        })}
      </div>

      <form className="flex flex-wrap items-end gap-2.5" role="search">
        <label htmlFor="q" className="sr-only">Search requests</label>
        <input id="q" name="q" defaultValue={one("q")} placeholder="Search patient, request ID…" className={cn(FIELD, "flex-[1_1_240px]")} />
        <label className="sr-only" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={status} className={FIELD}>
          <option value="">All statuses</option>
          {ACTIVE.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="type">Document type</label>
        <select id="type" name="type" defaultValue={type} className={FIELD}>
          <option value="">All document types</option>
          {(Object.keys(DOC_TYPES) as DocType[]).map((t) => (
            <option key={t} value={t}>{DOC_TYPES[t]}</option>
          ))}
        </select>
        <button type="submit" className="h-11 rounded-field bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="bg-background text-left text-caption text-muted-foreground">
              {["Deadline", "Request", "Patient", "Requested by", "Document", "Status"].map((h) => (
                <th key={h} className="px-4 py-3.5 font-semibold">{h}</th>
              ))}
              <th className="px-4 py-3.5"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-muted-foreground">No requests match.</td>
              </tr>
            )}
            {rows.map((r) => {
              const overdue = !!r.due_at && new Date(r.due_at).getTime() < stats.now;
              const self = r.patients?.profile_id === r.requester_id;
              return (
                <tr key={r.id} className={cn("border-t border-divider", overdue && "bg-attention")}>
                  <td className="px-4 py-3.5">
                    <DueCell dueAt={r.due_at} urgent={r.is_urgent} />
                  </td>
                  <td className="px-4 py-3.5 font-semibold">{r.code}</td>
                  <td className="px-4 py-3.5">{r.patients?.full_name}</td>
                  <td className="px-4 py-3.5">
                    {r.channel === "walk_in" ? (
                      <>
                        <span className="mr-1.5 rounded-md bg-info px-2 py-0.5 text-tiny font-bold text-info-foreground">WALK-IN</span>
                        {r.walk_in_name}
                      </>
                    ) : self ? (
                      "Self"
                    ) : (
                      `${r.profiles?.full_name ?? "—"} (caregiver)`
                    )}
                  </td>
                  <td className="px-4 py-3.5">{DOC_TYPES[r.doc_type]} — {r.detail}</td>
                  <td className="px-4 py-3.5"><StatusChip status={r.status} /></td>
                  <td className="px-4 py-3.5">
                    <Link href={`/admin/requests/${r.id}`} className="font-bold">
                      {r.status === "approved" ? "Release" : r.status === "info_requested" ? "Open" : "Review"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

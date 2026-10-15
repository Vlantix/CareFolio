import "server-only";
import { createClient } from "@/lib/supabase/server";
import { stampTime } from "@/lib/dates";

export type AuditFilters = { from: string; to: string; action: string; staff: string; patient: string };

export type AuditRow = {
  id: number;
  created_at: string;
  action: string;
  actor: string;
  patient: string;
  details: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/;

export function readFilters(params: Record<string, string | string[] | undefined>): AuditFilters {
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  return { from: one("from"), to: one("to"), action: one("action"), staff: one("staff"), patient: one("patient") };
}

/** Plain-English summary of an entry's details (old -> new for edits). */
function describe(details: Record<string, unknown>): string {
  const changes = details.changes as Record<string, { old: unknown; new: unknown }> | undefined;
  if (changes) {
    return Object.entries(changes)
      .map(([k, v]) => `${k}: ${JSON.stringify(v.old)} → ${JSON.stringify(v.new)}`)
      .join("; ");
  }
  const parts = Object.entries(details).filter(([k]) => k !== "new" && k !== "old");
  if (parts.length) return parts.map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join("; ");
  if (details.new) return "created";
  if (details.old) return "removed";
  return "";
}

/**
 * The audit trail with filters (read-only — the table can't be edited by
 * anyone). Filter values are passed as query parameters, never pasted
 * into SQL.
 */
export async function loadAudit(f: AuditFilters, limit: number) {
  const supabase = await createClient();
  let q = supabase
    .from("audit_logs")
    .select("id, created_at, action, actor_id, patient_id, entity, entity_id, details")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (DATE.test(f.from)) q = q.gte("created_at", `${f.from}T00:00:00+08:00`);
  if (DATE.test(f.to)) q = q.lte("created_at", `${f.to}T23:59:59+08:00`);
  if (f.action && /^[a-z_.]+$/.test(f.action)) q = q.eq("action", f.action);
  if (UUID.test(f.staff)) q = q.eq("actor_id", f.staff);
  if (UUID.test(f.patient)) q = q.eq("patient_id", f.patient);
  const { data } = await q;
  const logs = data ?? [];

  const actorIds = [...new Set(logs.map((l) => l.actor_id).filter(Boolean))] as string[];
  const patientIds = [...new Set(logs.map((l) => l.patient_id).filter(Boolean))] as string[];
  const [{ data: actors }, { data: patients }] = await Promise.all([
    actorIds.length ? supabase.from("profiles").select("id, full_name, role").in("id", actorIds) : Promise.resolve({ data: [] }),
    patientIds.length ? supabase.from("patients").select("id, full_name").in("id", patientIds) : Promise.resolve({ data: [] }),
  ]);
  const actorName = (id: string | null, action: string) => {
    if (!id) return action.startsWith("share.") ? "Doctor (shared link)" : "Public / system";
    const a = actors?.find((x) => x.id === id);
    return a ? `${a.full_name}${a.role === "admin" ? " (staff)" : ""}` : "Unknown";
  };

  return logs.map<AuditRow>((l) => ({
    id: l.id,
    created_at: l.created_at,
    action: l.action,
    actor: actorName(l.actor_id, l.action),
    patient: patients?.find((p) => p.id === l.patient_id)?.full_name ?? "",
    details: describe((l.details ?? {}) as Record<string, unknown>),
  }));
}

/** CSV text. Cells that start with = + - @ are prefixed so spreadsheet apps don't run them. */
export function toCsv(rows: AuditRow[]) {
  const cell = (v: string) => {
    const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const lines = [["When (Manila)", "Who", "Action", "Patient", "Details"].map(cell).join(",")];
  for (const r of rows) lines.push([stampTime(r.created_at), r.actor, r.action, r.patient, r.details].map(cell).join(","));
  return lines.join("\r\n");
}

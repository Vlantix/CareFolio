import Link from "next/link";
import { Plus } from "lucide-react";
import { PatientSwitcher } from "@/components/patient-switcher";
import { FormAlert } from "@/components/ui/form-alert";
import { BackButton } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";
import { createClient } from "@/lib/supabase/server";
import { DOC_TYPES, progressSteps, shortDate, type DocType, type RequestStatus } from "@/lib/records";
import { cn } from "@/lib/utils";
import { ReplyForm } from "./reply-form";

export const metadata = { title: "Requests · CareFolio" };

type Row = {
  id: string;
  code: string;
  doc_type: DocType;
  detail: string;
  purpose: string;
  status: RequestStatus;
  due_at: string | null;
  info_question: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
};

const TABS = [
  { key: "active", label: "Active", statuses: ["submitted", "under_review", "info_requested", "approved"] },
  { key: "released", label: "Released", statuses: ["released"] },
  { key: "declined", label: "Declined", statuses: ["declined"] },
] as const;

// design/MRequests.html
export default async function RequestsPage({ searchParams }: PageProps<"/requests">) {
  await requireMember();
  const { tab: tabParam, sent } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam) ?? TABS[0];
  const { patients, active } = await getActivePatient();

  const supabase = await createClient();
  const { data } = active
    ? await supabase
        .from("requests")
        .select("id, code, doc_type, detail, purpose, status, due_at, info_question, decline_reason, created_at, updated_at")
        .eq("patient_id", active.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const all = (data ?? []) as Row[];
  const count = (key: (typeof TABS)[number]) =>
    all.filter((r) => (key.statuses as readonly string[]).includes(r.status)).length;
  const rows = all.filter((r) => (tab.statuses as readonly string[]).includes(r.status));

  return (
    <main className="flex flex-col gap-3.5 px-5 pt-5 pb-6 md:max-w-3xl md:px-10 md:py-8">
      <div className="flex items-center gap-3">
        <BackButton href="/home" label="Back to home" />
        <h1 className="flex-1 font-heading text-title font-bold">Requests</h1>
        <Link
          href="/requests/new"
          aria-label="New request"
          className="flex size-11 items-center justify-center rounded-field bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground"
        >
          <Plus size={20} strokeWidth={2} aria-hidden />
        </Link>
      </div>
      {active && <PatientSwitcher patients={patients} activeId={active.id} />}
      {sent === "1" && <FormAlert tone="info">Request sent to the records office.</FormAlert>}

      {/* Tabs are links, so each list has its own address. */}
      <nav aria-label="Filter requests" className="flex gap-1.5 rounded-field bg-tab-track p-1">
        {TABS.map((t) => {
          const current = t.key === tab.key;
          const n = count(t);
          return (
            <Link
              key={t.key}
              href={`/requests?tab=${t.key}`}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-10 flex-1 items-center justify-center rounded-[9px] text-sm no-underline",
                current
                  ? "bg-card font-bold text-foreground hover:text-foreground"
                  : "font-semibold text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {t.key === "active" && ` (${n})`}
            </Link>
          );
        })}
      </nav>

      {!active && <p className="text-ui text-muted-foreground">No patient linked yet.</p>}
      {active && rows.length === 0 && (
        <p className="text-ui text-muted-foreground">Nothing here yet.</p>
      )}

      {rows.map((r) => {
        const info = r.status === "info_requested";
        const { done, current } = progressSteps(r.status);
        return (
          <article
            key={r.id}
            className={cn(
              "flex flex-col gap-3 rounded-card bg-card p-4",
              info ? "border-2 border-accent" : "border border-border",
            )}
          >
            <div className="flex justify-between gap-2.5">
              <span className="flex flex-col gap-0.5">
                <strong className="text-base">
                  {DOC_TYPES[r.doc_type]} — {r.detail}
                </strong>
                <span className="text-caption text-muted-foreground">
                  {r.code} · {r.purpose}
                </span>
              </span>
              <StatusChip status={r.status} />
            </div>

            {info && (
              <>
                <p className="rounded-chip bg-attention px-3 py-2.5 text-sm leading-[1.45] text-attention-foreground">
                  Records office: &ldquo;{r.info_question ?? "Please contact the records office."}&rdquo;
                </p>
                <ReplyForm requestId={r.id} />
              </>
            )}

            {r.status === "declined" && (
              <p className="rounded-chip bg-danger px-3 py-2.5 text-sm leading-[1.45] text-danger-foreground">
                <strong>Reason:</strong> {r.decline_reason ?? "No reason given."}
              </p>
            )}

            {r.status !== "declined" && !info && (
              <>
                <div className="grid grid-cols-5 gap-1" aria-hidden>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.25 rounded-[9px]",
                        i === current ? "bg-accent" : i < done ? "bg-primary" : "bg-border",
                      )}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-caption text-muted-foreground">
                  <span>Submitted {shortDate(r.created_at)}</span>
                  {r.status === "released" ? (
                    <Link href="/records" className="font-bold">
                      View in records
                    </Link>
                  ) : (
                    r.due_at && <strong className="text-foreground">Release by {shortDate(r.due_at)}</strong>
                  )}
                </div>
              </>
            )}
          </article>
        );
      })}
    </main>
  );
}

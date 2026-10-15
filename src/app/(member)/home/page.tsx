import Link from "next/link";
import { LogOut, QrCode } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { buttonVariants } from "@/components/ui/button";
import { LiveBell } from "@/components/live-bell";
import { LoginNotices } from "@/components/login-notices";
import { PatientSwitcher } from "@/components/patient-switcher";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";
import { createClient } from "@/lib/supabase/server";
import { FACILITY_NAME } from "@/lib/facility";
import { DOC_TYPES, latestPerTest, shortDate, type DocType, type RequestStatus } from "@/lib/records";
import { hourNow, longDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/logout";

export const metadata = { title: "Home · CareFolio" };

function greeting() {
  const hour = hourNow();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

type RequestRow = {
  id: string;
  doc_type: DocType;
  detail: string;
  status: RequestStatus;
  due_at: string | null;
};

// design/Home.html (mobile) and design/DHome.html (desktop).
export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const profile = await requireMember();
  const { error } = await searchParams;
  const { patients, active } = await getActivePatient();
  const firstName = profile.full_name.split(/\s+/)[0];
  const today = longDay(new Date());

  const supabase = await createClient();
  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  // Everything below is for the patient being viewed. RLS
  // (can_access_patient) refuses any patient this user may not see.
  const [requests, meds, labs, docCount] = active
    ? await Promise.all([
        supabase
          .from("requests")
          .select("id, doc_type, detail, status, due_at")
          .eq("patient_id", active.id)
          .not("status", "in", "(released,declined)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("medications")
          .select("id, name, dose, schedule, record_date, source")
          .eq("patient_id", active.id)
          .order("record_date", { ascending: false }),
        supabase
          .from("lab_values")
          .select("id, test_name, value, unit, record_date, source")
          .eq("patient_id", active.id)
          .order("record_date", { ascending: false }),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", active.id),
      ])
    : [null, null, null, null];
  const activeRequests = (requests?.data ?? []) as RequestRow[];
  const whose = active?.relationship === "You" ? "your" : `${active?.full_name.split(" ")[0]}'s`;

  return (
    <main className="flex flex-col gap-4 px-5 pt-5 pb-4 md:gap-6 md:px-10 md:py-8">
      {/* Phone header */}
      <div className="flex items-center gap-3 md:hidden">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground font-bold text-primary-foreground"
        >
          {initials(profile.full_name)}
        </span>
        <h1 className="flex flex-1 flex-col">
          <span className="text-caption font-normal text-muted-foreground">{greeting()},</span>
          <span className="font-heading text-xl font-bold">{firstName}</span>
        </h1>
        <LiveBell userId={profile.id} initialCount={unread ?? 0} />
        <form action={logout}>
          <button
            type="submit"
            aria-label="Log out"
            className="flex size-11 items-center justify-center rounded-field border border-border bg-card text-foreground hover:bg-primary-soft"
          >
            <LogOut size={20} strokeWidth={1.8} aria-hidden />
          </button>
        </form>
      </div>

      {/* Desktop header */}
      <div className="hidden flex-wrap items-center gap-4 md:flex">
        <div className="flex flex-[1_1_260px] flex-col gap-1">
          <span className="text-sm text-muted-foreground">{today}</span>
          <h1 className="font-heading text-[30px] font-bold tracking-[-0.02em]">
            {greeting()}, {firstName}
          </h1>
        </div>
        {active && <PatientSwitcher patients={patients} activeId={active.id} />}
        <LiveBell userId={profile.id} initialCount={unread ?? 0} />
      </div>

      <LoginNotices devicesHref="/profile/sessions" error={error === "1"} />

      {!active ? (
        <div className="rounded-field bg-primary-soft px-3.5 py-3 text-sm text-primary-deep">
          <strong>Waiting for the records office.</strong> They will link your
          account to {profile.role === "caregiver" ? "the patient you care for" : "your hospital record"}.
          After that you can request lab results here.
        </div>
      ) : (
        <>
          <div className="md:hidden">
            <PatientSwitcher patients={patients} activeId={active.id} />
          </div>

          <div className="flex flex-wrap gap-5">
            <section className="flex flex-[1_1_320px] flex-col gap-3.5 rounded-panel bg-primary p-4.5 text-primary-foreground md:gap-4 md:p-6">
              <div className="flex flex-col gap-1">
                <h2 className="font-heading text-xl font-bold md:text-title">At the doctor?</h2>
                <p className="text-sm text-on-primary-muted md:text-ui">
                  Show {whose} verified one-page summary in seconds.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 md:flex md:flex-wrap">
                <Link
                  href="/share"
                  className="flex h-12 items-center justify-center gap-2 rounded-field bg-card px-5 text-ui font-bold text-primary-deep no-underline hover:bg-primary-soft hover:text-primary-deep"
                >
                  <QrCode size={18} strokeWidth={2} aria-hidden /> Show QR
                </Link>
                <Link
                  href="/summary"
                  className="flex h-12 items-center justify-center rounded-field border border-pulse bg-primary-hover px-5 text-ui font-bold text-primary-foreground no-underline hover:text-primary-foreground"
                >
                  Summary
                </Link>
              </div>
            </section>
            <section className="hidden flex-[1_1_200px] flex-col gap-1.5 rounded-panel border border-border bg-card p-6 md:flex">
              <span className="text-sm text-muted-foreground">Active requests</span>
              <span className="font-heading text-[44px] font-extrabold">{activeRequests.length}</span>
              {activeRequests[0]?.due_at && (
                <span className="text-sm font-semibold text-attention-foreground">
                  Next release by {shortDate(activeRequests[0].due_at)}
                </span>
              )}
            </section>
            <section className="hidden flex-[1_1_200px] flex-col gap-1.5 rounded-panel border border-border bg-card p-6 md:flex">
              <span className="text-sm text-muted-foreground">Documents in folder</span>
              <span className="font-heading text-[44px] font-extrabold">{docCount?.count ?? 0}</span>
              <Link href="/records" className="text-sm font-semibold">Open timeline</Link>
            </section>
          </div>

          <section className="flex flex-col gap-2.5 md:rounded-panel md:border md:border-border md:bg-card md:p-6">
            <div className="flex items-baseline justify-between md:items-center">
              <h2 className="font-heading text-[17px] font-bold md:text-xl">Requests</h2>
              <Link href="/requests/new" className="text-sm font-semibold md:hidden">
                New request
              </Link>
              <Link href="/requests/new" className={cn(buttonVariants({ size: "sm" }), "hidden md:inline-flex")}>
                + New request
              </Link>
            </div>
            {activeRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active requests.</p>
            ) : (
              activeRequests.map((r) => (
                <Link
                  key={r.id}
                  href="/requests"
                  className="flex items-center gap-3 rounded-tile border border-border bg-card p-3.5 text-foreground no-underline hover:border-primary hover:text-foreground"
                >
                  <span className="flex flex-1 flex-col gap-0.75">
                    <span className="text-ui font-bold">
                      {DOC_TYPES[r.doc_type]} — {r.detail}
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {FACILITY_NAME}
                      {r.due_at && ` · Release by ${shortDate(r.due_at)}`}
                    </span>
                  </span>
                  <StatusChip status={r.status} className="self-center" />
                </Link>
              ))
            )}
          </section>

          <div className="flex flex-wrap gap-5">
            <SummaryList
              title="Current medications"
              empty="No medications on record."
              rows={(meds?.data ?? []).map((m) => ({
                id: m.id,
                name: m.name,
                detail: [m.dose, m.schedule].filter(Boolean).join(" · "),
              }))}
              footer={
                meds?.data?.[0]
                  ? `Source: ${meds.data[0].source} · updated ${shortDate(meds.data[0].record_date)}`
                  : undefined
              }
            />
            <SummaryList
              title="Latest lab values"
              empty="No lab values on record."
              rows={latestPerTest(labs?.data ?? []).slice(0, 4).map((l) => ({
                id: l.id,
                name: l.test_name,
                detail: `${l.value}${l.unit ? ` ${l.unit}` : ""} · ${shortDate(l.record_date)} · ${l.source}`,
              }))}
              footer="Every value shows its date and facility."
            />
          </div>
        </>
      )}
    </main>
  );
}

function SummaryList({
  title,
  rows,
  empty,
  footer,
}: {
  title: string;
  rows: { id: string; name: string; detail: string }[];
  empty: string;
  footer?: string;
}) {
  return (
    <Card className="flex flex-[1_1_320px] flex-col rounded-tile px-3.5 py-1 md:gap-2 md:rounded-panel md:p-6">
      <h2 className="mt-2.5 mb-1 font-heading text-[17px] font-bold md:m-0 md:mb-1.5 md:text-lg">{title}</h2>
      {rows.length === 0 && <p className="py-2.5 text-sm text-muted-foreground">{empty}</p>}
      {rows.map((r, i) => (
        <div
          key={r.id}
          className={cn(
            "flex justify-between gap-3 py-2.5 text-sm md:text-base",
            i < rows.length - 1 && "border-b border-divider",
          )}
        >
          <strong>{r.name}</strong>
          <span className="text-right text-muted-foreground">{r.detail}</span>
        </div>
      ))}
      {footer && <span className="pb-2.5 text-caption text-muted-foreground md:pb-0">{footer}</span>}
    </Card>
  );
}

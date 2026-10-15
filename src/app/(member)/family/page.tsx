import Link from "next/link";
import { FormAlert } from "@/components/ui/form-alert";
import { PageHeader } from "@/components/ui/page-header";
import { PatientSwitcher } from "@/components/patient-switcher";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";
import { createClient } from "@/lib/supabase/server";
import { mediumDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { approveCaregiver, removeCaregiver } from "./actions";
import { InviteForm } from "./invite-form";

export const metadata = { title: "Family access · CareFolio" };

type Member = {
  link_id: string | null;
  full_name: string;
  relationship: string;
  status: "pending" | "active" | "revoked";
  consent_at: string | null;
  can_request: boolean;
  can_view: boolean;
  can_share: boolean;
  is_patient: boolean;
  is_me: boolean;
  invited_by_me: boolean;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

// design/MFamily.html
export default async function FamilyPage({ searchParams }: PageProps<"/family">) {
  await requireMember();
  const { error } = await searchParams;
  const { patients, active } = await getActivePatient();
  const supabase = await createClient();
  const { data } = active ? await supabase.rpc("list_family", { p_patient: active.id }) : { data: [] };
  const members = (data ?? []) as Member[];
  const patientRow = members.find((m) => m.is_patient);
  const iAmPatient = !!patientRow?.is_me;
  const firstName = active?.full_name.split(" ")[0] ?? "";

  return (
    <main className="flex flex-col gap-3.5 px-5 pt-5 pb-6 md:max-w-2xl md:px-10 md:py-8">
      <PageHeader title="Family access" backHref="/home" backLabel="Back to home" />
      {active && <PatientSwitcher patients={patients} activeId={active.id} />}
      {error === "1" && <FormAlert>That didn&apos;t work. Please try again.</FormAlert>}
      {!active && <p className="text-ui text-muted-foreground">No patient linked yet.</p>}

      {active && (
        <>
          <p className="text-ui leading-normal text-muted-foreground">
            Caregivers can request and view records for {firstName} only with recorded consent.
          </p>
          <h2 className="font-heading text-subtitle font-bold">People with access</h2>

          {!patientRow && (
            <article className="flex items-center gap-3 rounded-tile border border-border bg-card p-3.5">
              <Avatar name={active.full_name} />
              <span className="flex flex-col">
                <strong>{active.full_name}</strong>
                <span className="text-caption text-muted-foreground">Patient · no CareFolio login (consent is recorded by the records office)</span>
              </span>
            </article>
          )}

          {members.map((m) => {
            const pending = m.status === "pending";
            const canRemove = !m.is_patient && (iAmPatient || m.is_me || (pending && m.invited_by_me));
            return (
              <article
                key={m.link_id ?? "patient"}
                className={cn(
                  "flex flex-col gap-3 rounded-tile bg-card p-3.5",
                  pending ? "border-[1.5px] border-dashed border-accent" : "border border-border",
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={m.full_name} />
                  <span className="flex flex-col">
                    <strong>
                      {m.full_name}
                      {m.is_me && " (you)"}
                    </strong>
                    <span className="text-caption text-muted-foreground">
                      {m.is_patient
                        ? "Patient · account owner"
                        : pending
                          ? `${m.relationship} · waiting for ${patientRow ? "patient" : "records office"} consent`
                          : `${m.relationship} · consent recorded ${m.consent_at ? mediumDate(m.consent_at) : ""}`}
                    </span>
                  </span>
                </div>
                {!m.is_patient && !pending && (
                  <div className="flex flex-wrap gap-1.5" aria-label="Permissions">
                    {[
                      ["Request", m.can_request],
                      ["View", m.can_view],
                      ["Share", m.can_share],
                    ].map(([label, on]) => (
                      <span
                        key={label as string}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-bold",
                          on ? "bg-primary-soft text-primary-deep" : "bg-background text-muted-foreground line-through",
                        )}
                      >
                        {label as string}
                      </span>
                    ))}
                  </div>
                )}
                {(pending && iAmPatient) || canRemove ? (
                  <div className="flex flex-wrap gap-2">
                    {pending && iAmPatient && m.link_id && (
                      <form action={approveCaregiver}>
                        <input type="hidden" name="linkId" value={m.link_id} />
                        <button type="submit" className="h-11 rounded-field bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
                          Approve access
                        </button>
                      </form>
                    )}
                    {canRemove && m.link_id && (
                      <form action={removeCaregiver}>
                        <input type="hidden" name="linkId" value={m.link_id} />
                        <button type="submit" className="h-11 rounded-field border-[1.5px] border-input bg-card px-4 text-sm font-semibold hover:bg-danger hover:text-danger-foreground">
                          {pending ? (iAmPatient ? "Decline" : "Cancel invite") : m.is_me ? "Leave" : "Remove access"}
                        </button>
                      </form>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}

          <InviteForm patientName={firstName} patientHasLogin={!!patientRow} />
          <Link href="/reminders" className="py-2 text-center text-sm font-semibold">
            Reminder settings
          </Link>
        </>
      )}
    </main>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground font-bold text-primary-foreground">
      {initials(name)}
    </span>
  );
}

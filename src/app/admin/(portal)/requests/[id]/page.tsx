import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/ui/status-chip";
import { DueCell } from "@/components/due-cell";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mediumDate } from "@/lib/dates";
import { DOC_TYPES, type DocType, type RequestStatus } from "@/lib/records";
import { ReviewForm } from "./review-form";

export const metadata = { title: "Review request · Records office" };

// design/AReview.html
export default async function ReviewRequestPage({ params }: PageProps<"/admin/requests/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("requests")
    .select("id, code, doc_type, detail, purpose, status, is_urgent, urgent_reason, due_at, created_at, info_question, info_reply, decline_reason, requester_id, patient_id, patients(full_name, hospital_no, profile_id), profiles(full_name, status)")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();

  const patient = r.patients as unknown as { full_name: string; hospital_no: string; profile_id: string | null };
  const requester = r.profiles as unknown as { full_name: string; status: string } | null;
  const isSelf = patient.profile_id === r.requester_id;
  const { data: link } = isSelf
    ? { data: null }
    : await supabase
        .from("caregiver_links")
        .select("relationship, status, consent_at")
        .eq("patient_id", r.patient_id)
        .eq("caregiver_id", r.requester_id)
        .maybeSingle();

  const docType = r.doc_type as DocType;
  const checks = [
    {
      name: "check_identity",
      label: "Requester identity confirmed",
      ok: requester?.status === "active",
      hint: requester?.status === "active" ? "Account verified by the records office" : `Account is ${requester?.status ?? "unknown"} — verify in Accounts first`,
    },
    {
      name: "check_consent",
      label: isSelf ? "Requester is the patient" : "Caregiver consent on file",
      ok: isSelf || (link?.status === "active" && !!link.consent_at),
      hint: isSelf
        ? "The patient requested their own record"
        : link?.consent_at && link.status === "active"
          ? `${link.relationship} · consent recorded ${mediumDate(link.consent_at)}`
          : "No consent on file — record it in Accounts first",
    },
    {
      name: "check_record",
      label: "Record exists",
      ok: true,
      hint: `Find "${DOC_TYPES[docType]} — ${r.detail}" in the hospital's records`,
    },
    { name: "check_purpose", label: "Purpose is acceptable", ok: true, hint: r.purpose },
  ];

  const closed = r.status === "released" || r.status === "declined";

  return (
    <main className="flex flex-col gap-5 px-5 py-6 md:px-8 md:py-8">
      <Link href="/admin" className="text-sm font-semibold">← Back to queue</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[28px] font-bold tracking-[-0.02em]">
            {r.code} · {DOC_TYPES[docType]} — {r.detail}
          </h1>
          <p className="mt-1 text-muted-foreground">
            For {patient.full_name} ({patient.hospital_no}) · requested by {isSelf ? "the patient" : `${requester?.full_name} (caregiver)`} ·{" "}
            {mediumDate(r.created_at)} · Purpose: {r.purpose}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusChip status={r.status as RequestStatus} />
          {!closed && (
            <span className="rounded-full bg-attention px-3 py-1.5 text-sm font-bold text-attention-foreground">
              <DueCell dueAt={r.due_at} urgent={r.is_urgent} />
            </span>
          )}
        </div>
      </div>

      {r.is_urgent && r.urgent_reason && (
        <p className="rounded-field bg-attention px-3.5 py-3 text-sm text-attention-foreground">
          <strong>Urgent:</strong> {r.urgent_reason}
        </p>
      )}
      {r.info_question && (
        <div className="rounded-field border border-border bg-card px-3.5 py-3 text-sm">
          <p><strong>Question asked:</strong> {r.info_question}</p>
          {r.info_reply && <p className="mt-1"><strong>Requester&apos;s answer:</strong> {r.info_reply}</p>}
        </div>
      )}

      {closed ? (
        <p className="rounded-field bg-primary-soft px-3.5 py-3 text-sm text-primary-deep">
          This request is {r.status}
          {r.decline_reason && ` — ${r.decline_reason}`}.
        </p>
      ) : (
        <ReviewForm
          requestId={r.id}
          status={r.status}
          patientName={patient.full_name}
          checks={checks}
          defaultTitle={`${DOC_TYPES[docType]} — ${r.detail}`}
        />
      )}
    </main>
  );
}

import { PageHeader } from "@/components/ui/page-header";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";
import { FACILITY_NAME } from "@/lib/facility";
import { RequestForm } from "./request-form";

export const metadata = { title: "Request a document · CareFolio" };

// design/MNewRequest.html
export default async function NewRequestPage() {
  const profile = await requireMember();
  const { active } = await getActivePatient();
  const blocked = profile.status !== "active" || !active;

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-6 md:max-w-2xl md:px-10 md:py-8">
      <PageHeader title="Request a document" backHref="/home" backLabel="Back to home" />
      {active ? (
        <p className="rounded-field bg-primary-soft px-3.5 py-3 text-sm text-primary-deep">
          For <strong>{active.full_name}</strong>
          {active.relationship === "You" ? " · your own record" : " · you're an authorized caregiver"}
        </p>
      ) : (
        <p className="rounded-field bg-attention px-3.5 py-3 text-sm text-attention-foreground">
          The records office hasn&apos;t linked your account to a patient yet.
        </p>
      )}
      <RequestForm facility={FACILITY_NAME} disabled={blocked} />
    </main>
  );
}

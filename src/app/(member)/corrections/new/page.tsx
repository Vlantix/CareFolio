import { PageHeader } from "@/components/ui/page-header";
import { requireMember } from "@/lib/auth";
import { getActivePatient } from "@/lib/patients";
import { createClient } from "@/lib/supabase/server";
import { mediumDate } from "@/lib/dates";
import { CorrectionForm } from "./correction-form";

export const metadata = { title: "Request a correction · CareFolio" };

// design/MCorrection.html
export default async function NewCorrectionPage() {
  const profile = await requireMember();
  const { active } = await getActivePatient();
  const supabase = await createClient();
  const [docs, meds, labs, allergies, diagnoses] = active
    ? await Promise.all([
        supabase.from("documents").select("id, title, record_date").eq("patient_id", active.id).order("record_date", { ascending: false }),
        supabase.from("medications").select("name").eq("patient_id", active.id),
        supabase.from("lab_values").select("test_name").eq("patient_id", active.id),
        supabase.from("allergies").select("allergen").eq("patient_id", active.id),
        supabase.from("diagnoses").select("name").eq("patient_id", active.id),
      ])
    : [];
  const unique = (values: string[]) => [...new Set(values)];
  const items = [
    { group: "Medications", labels: unique((meds?.data ?? []).map((m) => m.name)) },
    { group: "Lab values", labels: unique((labs?.data ?? []).map((l) => l.test_name)) },
    { group: "Allergies", labels: unique((allergies?.data ?? []).map((a) => a.allergen)) },
    { group: "Diagnoses", labels: unique((diagnoses?.data ?? []).map((d) => d.name)) },
  ].filter((g) => g.labels.length > 0);

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-6 md:max-w-2xl md:px-10 md:py-8">
      <PageHeader title="Request a correction" backHref="/requests" backLabel="Back to requests" />
      <p className="text-ui leading-normal text-muted-foreground">
        You can&apos;t edit records yourself — that keeps them official. Tell the records office
        what&apos;s wrong and they&apos;ll review it.
      </p>
      {active && (
        <p className="text-sm">
          For <strong>{active.full_name}</strong>
        </p>
      )}
      <CorrectionForm
        disabled={!active || profile.status !== "active"}
        documents={(docs?.data ?? []).map((d) => ({ id: d.id, label: `${d.title} · ${mediumDate(d.record_date)}` }))}
        items={items}
      />
    </main>
  );
}

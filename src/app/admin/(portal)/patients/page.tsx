import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Patient records · Records office" };

// Search, then open a patient's records (design/ARecords.html).
export default async function PatientsPage({ searchParams }: PageProps<"/admin/patients">) {
  await requireAdmin();
  const { q: raw } = await searchParams;
  const q = (typeof raw === "string" ? raw : "").trim().toLowerCase();
  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select("id, hospital_no, full_name, birthdate, profile_id, caregiver_links(status)")
    .order("full_name");
  const rows = (data ?? []).filter(
    (p) => !q || p.full_name.toLowerCase().includes(q) || p.hospital_no.toLowerCase().includes(q),
  );

  return (
    <main className="flex flex-col gap-5 px-5 py-6 md:px-8 md:py-8">
      <h1 className="font-heading text-[30px] font-bold tracking-[-0.02em]">Patient records</h1>
      <form role="search" className="flex gap-2.5">
        <label htmlFor="q" className="sr-only">Search patients</label>
        <input
          id="q"
          name="q"
          defaultValue={typeof raw === "string" ? raw : ""}
          placeholder="Search name or hospital no…"
          className="h-11 min-w-0 flex-1 rounded-field border-[1.5px] border-input bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none"
        />
        <button type="submit" className="h-11 rounded-field bg-primary px-4 text-sm font-semibold text-primary-foreground">Search</button>
      </form>
      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-background text-left text-caption text-muted-foreground">
              <th className="px-4 py-3.5 font-semibold">Patient</th>
              <th className="px-4 py-3.5 font-semibold">Hospital no.</th>
              <th className="px-4 py-3.5 font-semibold">Own login</th>
              <th className="px-4 py-3.5 font-semibold">Active caregivers</th>
              <th className="px-4 py-3.5"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-muted-foreground">No patients match.</td></tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-divider">
                <td className="px-4 py-3.5 font-semibold">{p.full_name}</td>
                <td className="px-4 py-3.5">{p.hospital_no}</td>
                <td className="px-4 py-3.5">{p.profile_id ? "Yes" : "No"}</td>
                <td className="px-4 py-3.5">
                  {(p.caregiver_links as { status: string }[]).filter((l) => l.status === "active").length}
                </td>
                <td className="px-4 py-3.5">
                  <Link href={`/admin/patients/${p.id}`} className="font-bold">Open records</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

import { IdCard } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mediumDate } from "@/lib/dates";
import { dayAndTime, timeOfDay } from "@/lib/dates";
import { recordConsent, unlockAccount } from "./actions";
import { AccountRequestActions, AddStaffForm, RegistrationActions, RoleForm } from "./forms";

export const metadata = { title: "Accounts · Records office" };

// design/AAccounts.html
export default async function AccountsPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const [{ data: pending }, { data: links }, { data: staff }, { data: locked }, { data: accountRequests }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, hospital_no, birthdate, created_at")
      .eq("status", "pending")
      .neq("role", "admin")
      .order("created_at"),
    supabase
      .from("caregiver_links")
      .select("id, relationship, created_at, patients(full_name, hospital_no, profile_id), profiles!caregiver_links_caregiver_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at"),
    supabase.from("profiles").select("id, full_name, email, role").eq("role", "admin").order("full_name"),
    supabase.rpc("admin_locked_accounts"),
    supabase
      .from("account_requests")
      .select("id, kind, new_value, requester_label, created_at, profiles!account_requests_profile_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at"),
  ]);
  // Patients without a login can't approve in the app: staff record it.
  const consentNeeded = (links ?? []).filter(
    (l) => !(l.patients as unknown as { profile_id: string | null } | null)?.profile_id,
  );

  return (
    <main className="flex flex-col gap-6 px-5 py-6 md:px-8 md:py-8">
      <h1 className="font-heading text-[30px] font-bold tracking-[-0.02em]">Accounts</h1>

      <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">New registrations · ID check needed</h2>
        {(pending ?? []).length === 0 && <p className="text-muted-foreground">No accounts waiting.</p>}
        {(pending ?? []).map((p) => (
          <article key={p.id} className="flex flex-wrap items-start gap-4 border-t border-divider pt-3 first-of-type:border-0 first-of-type:pt-0">
            {/* The ID photo + OCR step is parked (docs/LATER.md): check ID in person. */}
            <span className="flex h-16 w-24 shrink-0 flex-col items-center justify-center rounded-chip bg-background text-center text-tiny text-muted-foreground">
              <IdCard size={20} aria-hidden />
              No ID uploaded
            </span>
            <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
              <strong>
                {p.full_name} · {p.role}
              </strong>
              <span className="text-caption text-muted-foreground">
                {p.email} · born {p.birthdate ? mediumDate(p.birthdate) : "—"} ·{" "}
                {p.hospital_no ? `hospital no. ${p.hospital_no}` : "no hospital no. given — match manually"} · signed up{" "}
                {mediumDate(p.created_at)}
              </span>
              <RegistrationActions profileId={p.id} role={p.role as "patient" | "caregiver"} hospitalNo={p.hospital_no} />
            </div>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Name changes &amp; deletion requests</h2>
        <p className="text-caption text-muted-foreground">
          Deleting removes the login and personal data (contact details, notifications, reminders,
          devices, share links). The facility&apos;s medical records, requests and the audit trail are kept.
        </p>
        {(accountRequests ?? []).length === 0 && <p className="text-muted-foreground">Nothing waiting.</p>}
        {(accountRequests ?? []).map((q) => (
          <article key={q.id} className="flex flex-col gap-2 border-t border-divider pt-3">
            <span>
              <strong>{q.kind === "deletion" ? "Delete account" : `Change name to “${q.new_value}”`}</strong>
              <span className="text-caption text-muted-foreground"> · {q.requester_label} · {dayAndTime(q.created_at)}</span>
            </span>
            <AccountRequestActions requestId={q.id} kind={q.kind as "name_change" | "deletion"} />
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Locked out (too many wrong codes)</h2>
        {(locked ?? []).length === 0 && <p className="text-muted-foreground">No locked accounts.</p>}
        {((locked ?? []) as { profile_id: string; full_name: string; email: string; locked_until: string }[]).map((l) => (
          <form key={l.profile_id} action={unlockAccount} className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3">
            <input type="hidden" name="profile_id" value={l.profile_id} />
            <span>
              <strong>{l.full_name}</strong> · {l.email} · locked until {timeOfDay(l.locked_until)}
            </span>
            <button type="submit" className="h-11 rounded-field border-[1.5px] border-primary px-4 text-sm font-bold text-primary">
              Unlock
            </button>
          </form>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Caregiver consent to record</h2>
        <p className="text-caption text-muted-foreground">
          For patients with no CareFolio login. Record consent only after seeing the patient&apos;s signed
          consent form.
        </p>
        {consentNeeded.length === 0 && <p className="text-muted-foreground">Nothing waiting.</p>}
        {consentNeeded.map((l) => {
          const patient = l.patients as unknown as { full_name: string; hospital_no: string };
          const caregiver = l.profiles as unknown as { full_name: string } | null;
          return (
            <form key={l.id} action={recordConsent} className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3">
              <input type="hidden" name="link_id" value={l.id} />
              <span>
                <strong>{caregiver?.full_name}</strong> ({l.relationship}) for {patient.full_name} · {patient.hospital_no}
              </span>
              <button type="submit" className="h-11 rounded-field bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
                Record consent &amp; activate
              </button>
            </form>
          );
        })}
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">Staff accounts</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-caption text-muted-foreground">
                <th className="px-2 py-2 font-semibold">Name</th>
                <th className="px-2 py-2 font-semibold">Email</th>
                <th className="px-2 py-2 font-semibold">Two-factor</th>
                <th className="px-2 py-2 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {(staff ?? []).map((s) => (
                <tr key={s.id} className="border-t border-divider">
                  <td className="px-2 py-3 font-semibold">{s.full_name}</td>
                  <td className="px-2 py-3">{s.email}</td>
                  <td className="px-2 py-3">Email code · always on</td>
                  <td className="px-2 py-3">
                    <RoleForm profileId={s.id} current={s.role} self={s.id === me.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AddStaffForm />
      </section>
    </main>
  );
}

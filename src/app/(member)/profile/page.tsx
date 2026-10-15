import Link from "next/link";
import { Download, MonitorSmartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { InstallButton } from "@/components/pwa";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeletionForm, NameChangeForm, PasswordForm, PhoneForm, SuggestFacilityForm } from "./forms";

export const metadata = { title: "Profile · CareFolio" };

const SECTION = "flex flex-col gap-3 rounded-panel p-5";
const H2 = "font-heading text-lg font-bold";

// No design file: built from the shared blocks in the app's style.
export default async function ProfilePage() {
  const profile = await requireMember();
  const supabase = await createClient();
  const [{ data: me }, { data: requests }] = await Promise.all([
    supabase.from("profiles").select("phone").eq("id", profile.id).maybeSingle(),
    supabase.from("account_requests").select("kind, new_value, status").eq("status", "pending"),
  ]);
  const pendingName = requests?.find((r) => r.kind === "name_change")?.new_value ?? null;
  const pendingDeletion = !!requests?.some((r) => r.kind === "deletion");

  return (
    <main className="flex flex-col gap-4 px-5 pt-5 pb-6 md:max-w-2xl md:px-10 md:py-8">
      <PageHeader title="Profile" backHref="/home" backLabel="Back to home" />

      <Card className={SECTION}>
        <h2 className={H2}>Your details</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-semibold">{profile.full_name}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-semibold">{profile.email}</dd>
        </dl>
        <p className="text-caption text-muted-foreground">
          Your name must match your ID, so the records office checks any change.
        </p>
        <NameChangeForm pending={pendingName} />
        <PhoneForm phone={me?.phone ?? null} />
      </Card>

      <Card className={SECTION}>
        <h2 className={H2}>Security</h2>
        <PasswordForm />
        <Link href="/profile/sessions" className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <MonitorSmartphone size={18} aria-hidden /> Devices where you&apos;re logged in
        </Link>
        <InstallButton />
      </Card>

      <Card className={SECTION}>
        <h2 className={H2}>My data</h2>
        <p className="text-sm leading-normal text-muted-foreground">
          Under the Data Privacy Act of 2012 (RA 10173) you can get a copy of the data CareFolio
          holds about you, and ask for your account to be deleted.
        </p>
        <a
          href="/profile/data"
          className="flex min-h-11 items-center gap-2 self-start rounded-field border-[1.5px] border-input bg-card px-4 text-sm font-semibold no-underline"
        >
          <Download size={18} aria-hidden /> Download my data (JSON)
        </a>
        <div className="flex flex-col gap-2 border-t border-divider pt-3">
          <h3 className="font-semibold">Delete my account</h3>
          <p className="text-sm leading-normal text-muted-foreground">
            If the records office approves it, we delete your login, your contact details,
            notifications, reminders, devices and share links. <strong>The hospital keeps your
            medical records and the audit trail</strong> — the law requires hospitals to keep them.
            You can still request copies from the records office in person.
          </p>
          <DeletionForm waiting={pendingDeletion} />
        </div>
      </Card>

      <Card className={SECTION}>
        <h2 className={H2}>Suggest a facility</h2>
        <p className="text-sm text-muted-foreground">Want CareFolio at another hospital or clinic? Tell us.</p>
        <SuggestFacilityForm />
      </Card>
    </main>
  );
}

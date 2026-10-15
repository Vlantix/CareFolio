import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ProtectedView } from "@/components/protected-view";
import { createClient } from "@/lib/supabase/server";
import { hashToken, shareCodeCookie, SHARE_SECTIONS, type ShareSection } from "@/lib/share";
import { shortDate, timeOfDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { CodeForm } from "./code-form";

// Public: a doctor opens this from a QR code. No login. Never indexed or
// cached (also set as headers in next.config.ts).
export const metadata: Metadata = {
  title: "Shared summary · CareFolio",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

type Row = { record_date: string; source: string };
type Shared = {
  status: "ok";
  sections: ShareSection[];
  expires_at: string;
  shared_by: string;
  relation: string;
  patient: { full_name: string; age: number | null; sex: string | null };
  medications?: (Row & { name: string; dose: string | null; schedule: string | null })[];
  allergies?: (Row & { allergen: string; reaction: string | null; severity: string | null })[];
  labs?: (Row & { test_name: string; value: string; unit: string | null })[];
  diagnoses?: (Row & { name: string })[];
};


// design/MDoctorView.html
export default async function SharedPage({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  if (!/^[\w-]{43}$/.test(token)) return <Gone />;

  const tokenHash = hashToken(token);
  const codeHash = (await cookies()).get(shareCodeCookie(tokenHash))?.value ?? null;
  const userAgent = (await headers()).get("user-agent") ?? "";

  // A security definer function looks the link up by its HASH and
  // returns only the sections the patient chose. No service-role key.
  const supabase = await createClient();
  const { data } = await supabase.rpc("open_share", {
    p_token_hash: tokenHash,
    p_code_hash: codeHash,
    p_user_agent: userAgent,
  });
  const status = (data as { status: string } | null)?.status ?? "expired";

  if (status === "expired") return <Gone />;
  if (status === "locked") {
    return (
      <Gone
        title="This link is locked"
        body="The access code was entered wrongly too many times. Ask the patient or caregiver for a new link."
      />
    );
  }
  if (status !== "ok") {
    return (
      <Frame>
        <main className="cf-enter mx-auto flex w-full max-w-[420px] flex-col gap-5 px-5 py-8">
          <h1 className="font-heading text-title font-bold">Enter the access code</h1>
          <p className="text-ui text-muted-foreground">This shared summary is protected with a 4-digit code.</p>
          <CodeForm token={token} />
        </main>
      </Frame>
    );
  }

  const s = data as Shared;
  const notShared = (Object.keys(SHARE_SECTIONS) as ShareSection[]).filter((k) => !s.sections.includes(k));

  return (
    <Frame
      banner={
        <span className="text-caption text-sidebar-foreground">
          Shared by {s.shared_by} ({s.relation}) · read-only · expires {timeOfDay(s.expires_at)}
        </span>
      }
    >
      <main className="cf-enter flex flex-1 flex-col">
        <ProtectedView watermark="Viewed via shared link" audit={false} className="flex-1">
          <div className="flex flex-col gap-3.5 bg-card px-5 py-4.5 md:mx-auto md:max-w-2xl">
            <div className="flex flex-col gap-0.5">
              <h1 className="font-heading text-heading font-bold">{s.patient.full_name}</h1>
              <span className="text-sm text-muted-foreground">
                {[s.patient.age !== null && `${s.patient.age} yrs`, s.patient.sex].filter(Boolean).join(" · ")}
              </span>
            </div>

            {s.allergies && (
              <div className="rounded-field bg-attention px-3.5 py-3 text-sm text-attention-foreground">
                <strong>Allergies:</strong>{" "}
                {s.allergies.length === 0
                  ? "none on record"
                  : s.allergies
                      .map((a) => `${a.allergen}${a.reaction ? ` — ${a.reaction}` : ""}${a.severity ? ` (${a.severity})` : ""}`)
                      .join("; ")}
              </div>
            )}

            {s.medications && (
              <List
                title="Current medications"
                rows={s.medications.map((m) => ({
                  name: m.name,
                  detail: [m.dose, m.schedule].filter(Boolean).join(" · "),
                }))}
                footer={s.medications[0] && `Source: ${s.medications[0].source} · ${shortDate(s.medications[0].record_date)}`}
              />
            )}
            {s.labs && (
              <List
                title="Latest lab values"
                rows={s.labs.map((l) => ({
                  name: l.test_name,
                  detail: `${l.value}${l.unit ? ` ${l.unit}` : ""} · ${shortDate(l.record_date)} · ${l.source}`,
                }))}
              />
            )}
            {s.diagnoses && (
              <List
                title="Diagnoses"
                rows={s.diagnoses.map((d) => ({ name: d.name, detail: `${shortDate(d.record_date)} · ${d.source}` }))}
              />
            )}
            {notShared.length > 0 && (
              <p className="rounded-chip bg-background px-3 py-2.5 text-caption text-muted-foreground">
                {notShared.map((k) => SHARE_SECTIONS[k]).join(", ")} {notShared.length === 1 ? "was" : "were"} not
                shared by the patient.
              </p>
            )}
          </div>
        </ProtectedView>

        <div className="flex flex-col gap-2 border-t border-divider px-5 pt-3.5 pb-5 md:mx-auto md:w-full md:max-w-2xl">
          <Link
            href="/verify-document"
            className="flex h-12 items-center justify-center gap-2 rounded-field bg-primary-soft font-bold text-primary-deep no-underline hover:text-primary-deep"
          >
            <ShieldCheck size={18} aria-hidden /> Check a document&apos;s verification code
          </Link>
          <span className="text-center text-xs text-muted-foreground">
            No login needed. This view is logged for the patient.
          </span>
        </div>
      </main>
    </Frame>
  );
}

function Frame({ banner, children }: { banner?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-card">
      <header className="flex flex-col gap-1.5 bg-foreground px-5 py-4 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Image src="/brand/logo-mark.png" alt="" width={24} height={24} className="rounded-md" />
          <strong className="text-ui">CareFolio · Shared summary</strong>
        </div>
        {banner}
      </header>
      {children}
    </div>
  );
}

function List({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: { name: string; detail: string }[];
  footer?: string | false;
}) {
  return (
    <section className="flex flex-col">
      <h2 className="mb-1.5 text-caption tracking-[0.05em] text-muted-foreground uppercase">{title}</h2>
      {rows.length === 0 && <span className="py-2 text-sm text-muted-foreground">None on record.</span>}
      {rows.map((r, i) => (
        <div key={r.name + i} className={cn("flex flex-wrap justify-between gap-2 py-2.25 text-ui", i < rows.length - 1 && "border-b border-divider")}>
          <strong>{r.name}</strong>
          <span className="text-muted-foreground">{r.detail}</span>
        </div>
      ))}
      {footer && <span className="text-xs text-muted-foreground">{footer}</span>}
    </section>
  );
}

function Gone({
  title = "This link has expired",
  body = "Shared links only work for a short time, and the patient can end them early. Ask them for a new QR code.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <main className="cf-enter mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-6 px-6 pt-14 pb-8">
      <Logo size="lg" />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-hero leading-[1.1] font-bold tracking-[-0.02em]">{title}</h1>
        <p className="text-base leading-normal text-muted-foreground">{body}</p>
      </div>
      <Link href="/verify-document" className="font-semibold">
        Check a document&apos;s verification code
      </Link>
    </main>
  );
}

import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { getAuthState } from "@/lib/auth";
import { logout } from "@/app/actions/logout";
import { TermsForm } from "./terms-form";

export const metadata = { title: "Terms & privacy · CareFolio" };

// Adapted to the MVP: sharing, QR links and the protected viewer are
// parked (docs/LATER.md), so the terms don't promise them.
const SECTIONS = [
  {
    title: "1. What CareFolio does",
    body: "CareFolio lets patients and caregivers linked by the records office request, view and download official lab results from our partner hospital. Users cannot upload, edit or delete records; only the hospital's authorized staff can.",
  },
  {
    title: "2. Your health data",
    body: "Health information is sensitive personal information under the Data Privacy Act of 2012 (RA 10173). We collect only what is needed to handle your requests and encrypt data in transit and at rest.",
  },
  {
    title: "3. Email verification",
    body: "Every login is confirmed with a one-time 6-digit code sent to your email. Never share this code — CareFolio staff will never ask for it.",
  },
  {
    title: "4. Who can see your records",
    body: "Only you, caregivers the records office has linked to you, and authorized records staff. Every request and release is recorded.",
  },
  {
    title: "5. Not medical advice",
    body: "CareFolio does not diagnose or interpret results. Requests are handled in working days; it is not intended for emergencies.",
  },
  {
    title: "6. Your rights",
    body: "You may access, correct or delete your data at any time. Contact our Data Protection Officer at [DPO email]. Breaches are reported to the National Privacy Commission within 72 hours.",
  },
];

// design/Terms.html (mobile) and design/DTerms.html (desktop).
export default async function TermsPage() {
  const { userId, mfa, profile } = await getAuthState();
  if (!userId) redirect("/login");
  if (!mfa) redirect("/verify");
  if (profile?.terms_accepted_at) redirect("/home");

  const decline = (
    <button
      type="submit"
      form="decline"
      className="min-h-11 px-3 text-sm font-semibold text-muted-foreground hover:text-foreground lg:text-[15px]"
    >
      Decline and log out
    </button>
  );

  return (
    <div className="cf-enter flex min-h-full flex-1 flex-col">
      {/* The decline button sits inside the terms form's layout but submits this one. */}
      <form id="decline" action={logout} />

      <header className="hidden flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-10 py-5 lg:flex">
        <Logo />
        <div className="flex items-center gap-3.5 text-sm font-semibold text-muted-foreground">
          <span>Final step</span>
          <Progress className="grid-cols-[repeat(4,40px)]" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-[18px] px-6 pt-6 pb-7 lg:flex-row lg:flex-wrap lg:items-start lg:gap-8 lg:px-8 lg:py-10">
        {/* Phone: progress bar on top */}
        <div className="flex flex-col gap-2.5 lg:hidden">
          <div className="flex justify-between text-[13px] font-semibold text-muted-foreground">
            <span>Final step</span>
          </div>
          <Progress className="grid-cols-4" />
        </div>

        <nav aria-label="Terms sections" className="flex flex-col gap-1.5 text-[15px] lg:flex-[1_1_220px]">
          <h1 className="font-heading text-[26px] leading-[1.15] font-bold tracking-[-0.02em] lg:mb-3 lg:text-[30px]">
            Terms &amp; privacy
          </h1>
          <p className="text-[15px] leading-normal text-muted-foreground lg:hidden">
            Read and accept to finish creating your account.
          </p>
          {SECTIONS.map((s, i) => (
            <a
              key={s.title}
              href={`#t${i + 1}`}
              className="hidden rounded-[10px] px-3 py-2.5 text-body-text no-underline hover:bg-primary-soft hover:text-primary-deep lg:block"
            >
              {s.title}
            </a>
          ))}
        </nav>

        <div className="flex flex-1 flex-col gap-[18px] lg:flex-[999_1_560px] lg:gap-5 lg:rounded-panel lg:border lg:border-border lg:bg-card lg:p-7">
          <div
            tabIndex={0}
            aria-label="Terms and conditions text"
            className="flex h-[330px] flex-col gap-3.5 overflow-y-auto rounded-tile border border-border bg-card px-[18px] py-4 text-sm leading-[1.55] text-body-text focus-visible:outline-2 focus-visible:outline-ring lg:h-[340px] lg:gap-[18px] lg:rounded-none lg:border-0 lg:p-0 lg:pr-3 lg:text-[15px] lg:leading-[1.65]"
          >
            {SECTIONS.map((s, i) => (
              <section key={s.title} id={`t${i + 1}`}>
                <h2 className="mb-1 font-heading text-[15px] font-bold text-foreground lg:text-base">
                  {s.title}
                </h2>
                <p>{s.body}</p>
              </section>
            ))}
          </div>
          <TermsForm declineSlot={decline} />
        </div>
      </main>
    </div>
  );
}

function Progress({ className }: { className: string }) {
  return (
    <div className={`grid gap-1.5 ${className}`} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="h-1.5 rounded-full bg-primary" />
      ))}
    </div>
  );
}

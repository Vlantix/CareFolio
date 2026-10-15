import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "CareFolio — Every record. One folder. Any doctor.",
  description:
    "Request your official lab results online. No travel, no queuing — your records delivered straight to your phone.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border px-5 py-3 flex items-center justify-between">
        <Logo size="lg" />
        <Link
          href="/login"
          className="h-10 px-5 rounded-[14px] bg-primary text-primary-foreground font-semibold text-[15px] inline-flex items-center hover:bg-primary-hover transition-colors"
        >
          Log in
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="bg-navy text-primary-foreground px-5 pt-16 pb-20 flex flex-col items-center text-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <span className="inline-block px-3 py-1 rounded-full bg-[#1e3d52] text-[#b9d3d6] text-[13px] font-semibold tracking-wide">
            Pilot · PHINMA Health Partners
          </span>
          <h1 className="font-heading font-extrabold text-[32px] leading-[1.1] tracking-[-0.02em] max-w-xs">
            Every record.<br />One folder.<br />Any doctor.
          </h1>
          <p className="text-[17px] text-[#b9d3d6] leading-relaxed max-w-sm">
            Request your official lab results from your phone. No travel,
            no queuing, no repeated tests.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:justify-center">
          <Link
            href="/signup"
            className="h-[54px] px-8 rounded-[14px] bg-splash-teal text-navy font-bold text-[17px] inline-flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="h-[54px] px-8 rounded-[14px] border-[1.5px] border-[#2bb3a6] text-primary-foreground font-semibold text-[17px] inline-flex items-center justify-center hover:bg-[#1e3d52] transition-colors"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="px-5 py-16 flex flex-col items-center gap-10 max-w-2xl mx-auto">
        <h2 className="font-heading font-bold text-[26px] tracking-[-0.02em] text-center">
          How it works
        </h2>

        <ol className="w-full flex flex-col gap-6">
          {[
            {
              step: "1",
              title: "Submit a request",
              body: "Fill out the lab test name and date from your phone. The records office receives it instantly — no form, no travel.",
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              ),
            },
            {
              step: "2",
              title: "Track in real time",
              body: "See whether your request is under review, approved or declined — and get notified the moment something changes.",
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ),
            },
            {
              step: "3",
              title: "Download the official PDF",
              body: "Once released, view and download the original document on your phone. Show it directly to any doctor, employer or insurer.",
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              ),
            },
          ].map(({ step, title, body, icon }) => (
            <li
              key={step}
              className="flex gap-4 p-5 bg-card rounded-[22px] border border-border"
            >
              <div className="w-11 h-11 rounded-[14px] bg-primary-soft text-primary flex items-center justify-center flex-none">
                {icon}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-heading font-bold text-[17px] tracking-[-0.01em]">
                  {title}
                </span>
                <p className="text-[14px] leading-relaxed text-muted-foreground m-0">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Who it's for ────────────────────────────────────────── */}
      <section className="bg-primary-soft px-5 py-14 flex flex-col items-center gap-8">
        <h2 className="font-heading font-bold text-[26px] tracking-[-0.02em] text-center">
          Built for patients and their families
        </h2>

        <div className="w-full max-w-2xl grid sm:grid-cols-2 gap-5">
          {[
            {
              label: "Patients",
              description:
                "Sign up with your email and hospital number. Request your own records, view them any time, and share a verified summary with any doctor — without printing a single page.",
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ),
            },
            {
              label: "Caregivers",
              description:
                "Link your account to a family member's patient record through the records office. Manage their requests and download their results on their behalf.",
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              ),
            },
          ].map(({ label, description, icon }) => (
            <div
              key={label}
              className="bg-card rounded-[22px] border border-border p-6 flex flex-col gap-3"
            >
              <div className="w-11 h-11 rounded-[14px] bg-primary text-primary-foreground flex items-center justify-center flex-none">
                {icon}
              </div>
              <h3 className="font-heading font-bold text-[20px] tracking-[-0.01em] m-0">
                {label}
              </h3>
              <p className="text-[14px] leading-relaxed text-muted-foreground m-0">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Security note ───────────────────────────────────────── */}
      <section className="px-5 py-14 flex flex-col items-center gap-5 max-w-xl mx-auto text-center">
        <div className="w-12 h-12 rounded-[14px] bg-primary-soft text-primary flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h2 className="font-heading font-bold text-[22px] tracking-[-0.02em] m-0">
          Your records stay private
        </h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground m-0">
          Every login requires your password <em>and</em> a one-time code
          sent to your email. Records are only visible after both checks
          pass. Files are served on short-lived signed links — nothing is
          ever left open.
        </p>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="bg-navy text-primary-foreground px-5 py-16 flex flex-col items-center gap-6 text-center">
        <h2 className="font-heading font-extrabold text-[28px] leading-[1.1] tracking-[-0.02em] max-w-xs">
          Ready to take control of your health records?
        </h2>
        <p className="text-[16px] text-[#b9d3d6] leading-relaxed max-w-sm m-0">
          Create a free account and request your first lab result today.
        </p>
        <Link
          href="/signup"
          className="h-[54px] px-10 rounded-[14px] bg-splash-teal text-navy font-bold text-[17px] inline-flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          Get started
        </Link>
        <p className="text-[14px] text-[#b9d3d6] m-0">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-white underline-offset-2 hover:underline">
            Log in
          </Link>
        </p>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-border px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-muted-foreground">
        <Logo size="md" />
        <span>© {new Date().getFullYear()} CareFolio · Pilot programme</span>
      </footer>
    </div>
  );
}

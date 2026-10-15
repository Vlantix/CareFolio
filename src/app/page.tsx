import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "CareFolio — Your lab results, on your phone",
  description:
    "Request your official lab results without leaving home. No travel, no queue, no repeated trips to the records window.",
};

// Phone mockup keyframes: Submitted → Under review → Released (9 s loop)
const ANIM_CSS = `
  @keyframes cf-lp-sub {
    0%,4%{opacity:0} 10%,28%{opacity:1} 35%,100%{opacity:0}
  }
  @keyframes cf-lp-rev {
    0%,30%{opacity:0} 37%,58%{opacity:1} 65%,100%{opacity:0}
  }
  @keyframes cf-lp-rel {
    0%,61%{opacity:0} 68%,100%{opacity:1}
  }
  @keyframes cf-lp-dl {
    0%,63%{opacity:0;transform:translateY(7px)} 70%,100%{opacity:1;transform:translateY(0)}
  }
  .cf-lp-sub{animation:cf-lp-sub 9s ease-in-out infinite}
  .cf-lp-rev{animation:cf-lp-rev 9s ease-in-out infinite}
  .cf-lp-rel{animation:cf-lp-rel 9s ease-in-out infinite}
  .cf-lp-dl {animation:cf-lp-dl  9s ease-in-out infinite}
  @media(prefers-reduced-motion:reduce){
    .cf-lp-sub,.cf-lp-rev{opacity:0!important;animation:none!important}
    .cf-lp-rel,.cf-lp-dl{opacity:1!important;transform:none!important;animation:none!important}
  }
  details summary{list-style:none;cursor:pointer;user-select:none}
  details summary::-webkit-details-marker{display:none}
  details[open] .faq-icon{transform:rotate(45deg)}
  .faq-icon{transition:transform 0.2s ease}
  @media(prefers-reduced-motion:reduce){.faq-icon{transition:none}}
`;

export default function LandingPage() {
  return (
    <>
      {/* Page-scoped animation CSS */}
      <style>{ANIM_CSS}</style>

      <div className="min-h-screen bg-background font-sans text-foreground">
        {/* ── Nav ─────────────────────────────────────────────────────────── */}
        <nav className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
          <div className="mx-auto max-w-5xl px-5 py-3 flex items-center justify-between">
            <Logo size="md" />
            <Link
              href="/login"
              className="text-[15px] font-semibold text-foreground hover:text-primary transition-colors"
            >
              Log in
            </Link>
          </div>
        </nav>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="bg-navy">
          <div className="mx-auto max-w-5xl px-5 py-16 lg:py-24 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Text */}
            <div className="flex-1 flex flex-col gap-6 text-center lg:text-left">
              <span className="inline-flex self-center lg:self-start px-3 py-1.5 rounded-full bg-navy-track text-splash-tag text-[13px] font-semibold tracking-wide">
                Every record. One folder. Any doctor.
              </span>

              <h1 className="font-heading font-extrabold text-[38px] sm:text-[46px] leading-[1.06] tracking-[-0.025em] text-white max-w-sm mx-auto lg:mx-0">
                Your lab results,<br />on your phone.<br />Skip the trip back.
              </h1>

              <p className="text-[17px] leading-relaxed text-splash-tag max-w-md mx-auto lg:mx-0">
                No more filing leave, commuting across the city, queuing at the records window, or coming back a second time. Two minutes to request. Get notified. Download the official PDF.
              </p>

              <div className="flex justify-center lg:justify-start">
                <Link
                  href="/signup"
                  className="h-[54px] px-8 rounded-[14px] bg-splash-teal text-navy font-bold text-[17px] inline-flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  Request your first result — free
                </Link>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 justify-center lg:justify-start text-[13px] text-splash-tag/70">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-sm bg-navy-track inline-block" aria-hidden="true" />
                  Pilot partner: PHINMA Health Partners
                </span>
                <span aria-hidden="true">·</span>
                <span>Two-step login</span>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="flex-none flex justify-center" aria-hidden="true">
              <div
                style={{
                  background: "#0a1e2e",
                  borderRadius: "38px",
                  padding: "10px 10px 16px",
                  width: "226px",
                  boxShadow:
                    "0 28px 72px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
                }}
              >
                {/* Camera pill */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: "7px",
                  }}
                >
                  <div
                    style={{
                      width: "54px",
                      height: "6px",
                      background: "#061320",
                      borderRadius: "4px",
                    }}
                  />
                </div>
                {/* Screen */}
                <div
                  style={{
                    background: "#f3f6f5",
                    borderRadius: "30px",
                    overflow: "hidden",
                  }}
                >
                  {/* Mini header */}
                  <div
                    style={{
                      background: "#0e293c",
                      padding: "9px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#b9d3d6",
                        fontFamily: "system-ui",
                        letterSpacing: "0.01em",
                      }}
                    >
                      CareFolio
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#7da8b0",
                        fontFamily: "system-ui",
                      }}
                    >
                      Hi, Maria
                    </span>
                  </div>

                  {/* Content */}
                  <div
                    style={{
                      padding: "14px 12px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        color: "#4b6164",
                        fontFamily: "system-ui",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Lab request
                    </div>

                    {/* Request card */}
                    <div
                      style={{
                        background: "#ffffff",
                        borderRadius: "16px",
                        padding: "12px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#10292c",
                          fontFamily: "system-ui",
                          marginBottom: "2px",
                        }}
                      >
                        HbA1c (Diabetes)
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#6b8c8e",
                          fontFamily: "system-ui",
                          marginBottom: "11px",
                        }}
                      >
                        Oct 2024 · PHINMA Hospital
                      </div>

                      {/* Animated status badges */}
                      <div style={{ position: "relative", height: "22px" }}>
                        <span
                          className="cf-lp-sub"
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "#eef2f2",
                            color: "#5a7a82",
                            fontSize: "10px",
                            fontWeight: 600,
                            fontFamily: "system-ui",
                            padding: "3px 8px",
                            borderRadius: "20px",
                            display: "inline-flex",
                            alignItems: "center",
                            whiteSpace: "nowrap",
                            width: "fit-content",
                          }}
                        >
                          Submitted
                        </span>
                        <span
                          className="cf-lp-rev"
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "#fdf0e1",
                            color: "#8a4209",
                            fontSize: "10px",
                            fontWeight: 600,
                            fontFamily: "system-ui",
                            padding: "3px 8px",
                            borderRadius: "20px",
                            display: "inline-flex",
                            alignItems: "center",
                            whiteSpace: "nowrap",
                            width: "fit-content",
                          }}
                        >
                          Under review
                        </span>
                        <span
                          className="cf-lp-rel"
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "#e3f1ef",
                            color: "#0b4a46",
                            fontSize: "10px",
                            fontWeight: 600,
                            fontFamily: "system-ui",
                            padding: "3px 8px",
                            borderRadius: "20px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            whiteSpace: "nowrap",
                            width: "fit-content",
                          }}
                        >
                          <svg
                            width="8"
                            height="8"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Released
                        </span>
                      </div>
                    </div>

                    {/* Download button — animated in */}
                    <div
                      className="cf-lp-dl"
                      style={{
                        background: "#0b6e69",
                        borderRadius: "12px",
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "white",
                          fontFamily: "system-ui",
                        }}
                      >
                        Download official PDF
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Before vs CareFolio ─────────────────────────────────────────── */}
        <section className="px-5 py-16">
          <div className="mx-auto max-w-4xl flex flex-col gap-10">
            <h2 className="font-heading font-bold text-[26px] tracking-[-0.02em] text-center">
              What changes when you use CareFolio
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Before */}
              <div className="bg-card rounded-[22px] border border-border p-6 flex flex-col gap-4">
                <div className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                  Before
                </div>
                <ul className="flex flex-col gap-3">
                  {[
                    "File for a day's leave from work",
                    "Commute to the hospital",
                    "Queue at the records window",
                    "Come back to collect — or wait again",
                    "Repeat the test if the form was lost",
                  ].map((text) => (
                    <li
                      key={text}
                      className="flex items-start gap-3 text-[14px] text-muted-foreground leading-snug"
                    >
                      <span className="w-5 h-5 rounded-full bg-danger text-danger-foreground flex items-center justify-center flex-none mt-0.5 shrink-0">
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* With CareFolio */}
              <div className="bg-primary-soft rounded-[22px] border border-primary/20 p-6 flex flex-col gap-4">
                <div className="text-[12px] font-bold uppercase tracking-widest text-primary-deep">
                  With CareFolio
                </div>
                <ul className="flex flex-col gap-3">
                  {[
                    "Request in 2 minutes from your phone",
                    "Get notified the moment it's released",
                    "Download the official PDF from anywhere",
                    "Show any doctor, employer, or insurer",
                  ].map((text) => (
                    <li
                      key={text}
                      className="flex items-start gap-3 text-[14px] text-foreground leading-snug"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-none mt-0.5 shrink-0">
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <section className="bg-primary-soft/50 px-5 py-16">
          <div className="mx-auto max-w-3xl flex flex-col gap-10">
            <h2 className="font-heading font-bold text-[26px] tracking-[-0.02em] text-center">
              How it works
            </h2>
            <ol className="flex flex-col sm:flex-row gap-5">
              {[
                {
                  n: "1",
                  title: "Submit a 2-minute request from your phone",
                  body: "Enter the test name and approximate date. The records office receives it immediately — no form, no travel.",
                },
                {
                  n: "2",
                  title: "Track its status in real time",
                  body: "See when your request moves from submitted to under review to released. Get notified the moment something changes.",
                },
                {
                  n: "3",
                  title: "Download the official PDF",
                  body: "Once released, view and download the original document. Show it to any doctor, employer, or insurer directly from your phone.",
                },
              ].map(({ n, title, body }) => (
                <li
                  key={n}
                  className="flex-1 min-w-0 bg-card rounded-[22px] border border-border p-6 flex flex-col gap-3"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-primary text-primary-foreground font-heading font-bold text-[18px] flex items-center justify-center flex-none">
                    {n}
                  </div>
                  <h3 className="font-heading font-bold text-[15px] tracking-[-0.01em] leading-snug">
                    {title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Built for families ──────────────────────────────────────────── */}
        <section className="px-5 py-16">
          <div className="mx-auto max-w-4xl flex flex-col gap-10">
            <div className="flex flex-col gap-3 text-center max-w-xl mx-auto">
              <h2 className="font-heading font-bold text-[26px] tracking-[-0.02em]">
                Built for patients and their families
              </h2>
              <p className="text-[16px] leading-relaxed text-muted-foreground">
                Ana manages her mother&rsquo;s diabetes check-ups from Manila while her mother lives in Cebu. She requested three lab results during her lunch break last month — no leave, no queue. Her mother&rsquo;s doctor had everything that same afternoon.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {[
                {
                  label: "Patients",
                  description:
                    "Sign up with your email and hospital number. Request your own records, view them any time, and share a verified PDF with any doctor — without printing or traveling.",
                  svg: (
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  ),
                },
                {
                  label: "Caregivers",
                  description:
                    "Link your account to a family member's patient record through the records office. Request and download results on their behalf — from wherever you are.",
                  svg: (
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  ),
                },
              ].map(({ label, description, svg }) => (
                <div
                  key={label}
                  className="bg-card rounded-[22px] border border-border p-6 flex flex-col gap-3"
                >
                  <div className="w-11 h-11 rounded-[14px] bg-primary text-primary-foreground flex items-center justify-center flex-none">
                    {svg}
                  </div>
                  <h3 className="font-heading font-bold text-[20px] tracking-[-0.01em]">
                    {label}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security ────────────────────────────────────────────────────── */}
        <section className="bg-primary-soft px-5 py-14">
          <div className="mx-auto max-w-3xl flex flex-col gap-8">
            <h2 className="font-heading font-bold text-[26px] tracking-[-0.02em] text-center">
              Your records stay private
            </h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {[
                {
                  title: "Password and a one-time code",
                  body: "Every login requires your password and a code sent to your email. Both must match — there's no way in with just one.",
                  svg: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ),
                },
                {
                  title: "Records visible only after both checks",
                  body: "No code, no access — even if someone knows your email address. Patient data is hidden until both factors are confirmed.",
                  svg: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  ),
                },
                {
                  title: "Files on short-lived, expiring links",
                  body: "Documents are served on links that expire after 60 seconds. After that, the link stops working — nothing is left open.",
                  svg: (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  ),
                },
              ].map(({ title, body, svg }) => (
                <div
                  key={title}
                  className="bg-card rounded-[22px] border border-border p-5 flex flex-col gap-3"
                >
                  <div className="w-10 h-10 rounded-[12px] bg-primary-soft text-primary flex items-center justify-center flex-none">
                    {svg}
                  </div>
                  <h3 className="font-heading font-semibold text-[15px] leading-snug">
                    {title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section className="px-5 py-16">
          <div className="mx-auto max-w-2xl flex flex-col gap-8">
            <h2 className="font-heading font-bold text-[26px] tracking-[-0.02em] text-center">
              Common questions
            </h2>
            <div className="flex flex-col divide-y divide-border">
              {[
                {
                  q: "Is it free?",
                  a: "Yes. CareFolio is free for patients and caregivers during the pilot.",
                },
                {
                  q: "Which hospitals are supported?",
                  a: "CareFolio is currently piloted with PHINMA Health Partners facilities. More will be added as the pilot expands.",
                },
                {
                  q: "How long does it take to get my result?",
                  a: "That depends on the records office — not on CareFolio. You'll be notified the moment they release it, so you don't need to follow up or check back manually.",
                },
                {
                  q: "Will my doctor or employer accept the PDF?",
                  a: "The PDF is an official copy released by the hospital's records office — the same document you'd collect in person. Whether a specific doctor or employer accepts digital records is their call.",
                },
                {
                  q: "Can I request records for a family member?",
                  a: "Yes, if the records office links your account as a caregiver. Ask the records staff to set this up at your next visit.",
                },
              ].map(({ q, a }) => (
                <details key={q} className="py-4">
                  <summary className="flex items-center justify-between gap-4 font-semibold text-[16px] text-foreground">
                    {q}
                    <span className="faq-icon text-muted-foreground flex-none">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                    {a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────────────────── */}
        <section className="bg-navy text-white px-5 py-16 flex flex-col items-center gap-5 text-center">
          <h2 className="font-heading font-extrabold text-[32px] leading-[1.08] tracking-[-0.025em] max-w-xs">
            Ready to skip the trip?
          </h2>
          <p className="text-[16px] text-splash-tag leading-relaxed max-w-sm">
            Request your first lab result from your phone. It only takes two minutes, and it&rsquo;s free.
          </p>
          <Link
            href="/signup"
            className="h-[54px] px-10 rounded-[14px] bg-splash-teal text-navy font-bold text-[17px] inline-flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            Request your first result — free
          </Link>
          <p className="text-[14px] text-splash-tag/70">
            No credit card. No app download. Already have an account?{" "}
            <Link href="/login" className="font-semibold text-white underline-offset-2 hover:underline">
              Log in
            </Link>
          </p>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="border-t border-border px-5 py-8">
          <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-muted-foreground">
            <Logo size="md" />
            <span>© {new Date().getFullYear()} CareFolio · Pilot programme · PHINMA Health Partners</span>
          </div>
        </footer>
      </div>
    </>
  );
}

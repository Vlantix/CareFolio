"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { finishOnboarding } from "./actions";

// Copy from design/Guide1-3.html (phone) and design/DGuide.html (desktop).
const STEPS = [
  {
    title: "Request official documents",
    mobile:
      "Choose a lab result, medical certificate, medical abstract, prescription copy or discharge summary. Pick the facility and purpose, then submit — no trip to the records office.",
    desktop:
      "Choose a lab result, medical certificate, medical abstract, prescription copy or discharge summary. Pick the facility and purpose, then submit — no trip to the records office.",
  },
  {
    title: "Track, then view and download",
    mobile:
      "Follow each request from Submitted to Released. Released documents land in your timeline — filter by date, type, doctor or facility, and download them as PDF.",
    desktop:
      "Follow each request from Submitted to Released and get notified at every change. Released documents land in your timeline, filterable by date, type, doctor and facility.",
  },
  {
    title: "Show any doctor in seconds",
    mobile:
      "Open the one-page summary or a time-limited QR link. You choose what the doctor sees, and you can revoke access anytime. Prefer paper? Print the summary as PDF.",
    desktop:
      "Open the one-page summary or a time-limited QR link. You choose what the doctor sees and can revoke access anytime. Caregivers can be added with the patient’s consent.",
  },
];

export function Guide() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const last = step === STEPS.length - 1;

  // Move focus to the new step's heading, so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  function next() {
    if (!last) return setStep(step + 1);
    startTransition(async () => {
      const result = await finishOnboarding();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Desktop top bar */}
      <header className="hidden flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-10 py-5 lg:flex">
        <Logo />
        <div className="flex items-center gap-3.5 text-sm font-semibold text-muted-foreground">
          <span>How CareFolio works · {step + 1} of 4</span>
          <Progress step={step} className="grid-cols-[repeat(4,40px)]" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[22px] px-6 pt-6 pb-8 lg:flex-row lg:flex-wrap lg:items-center lg:gap-14 lg:px-8 lg:py-14">
        {/* Phone progress */}
        <div className="flex flex-col gap-2.5 lg:hidden">
          <div className="flex justify-between text-[13px] font-semibold text-muted-foreground">
            <span>How CareFolio works</span>
            <span>{step + 1} of 4</span>
          </div>
          <Progress step={step} className="grid-cols-4" />
        </div>

        <div className="flex h-[300px] items-center justify-center rounded-[24px] bg-primary-soft p-6 lg:h-auto lg:min-h-[400px] lg:flex-[1_1_420px] lg:rounded-[28px] lg:p-10">
          {step === 0 && <RequestIllustration />}
          {step === 1 && <TrackIllustration />}
          {step === 2 && <ShareIllustration />}
        </div>

        <div className="flex flex-col gap-2.5 lg:flex-[1_1_380px] lg:gap-5">
          <span className="hidden text-sm font-bold tracking-[0.04em] text-attention-icon uppercase lg:block">
            Step {step + 1}
          </span>
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-heading text-[26px] leading-[1.15] font-bold tracking-[-0.02em] outline-none lg:text-[40px] lg:leading-[1.08]"
          >
            {STEPS[step].title}
          </h1>
          <p className="text-[15px] leading-[1.55] text-muted-foreground lg:text-lg lg:leading-[1.6]">
            <span className="lg:hidden">{STEPS[step].mobile}</span>
            <span className="hidden lg:inline">{STEPS[step].desktop}</span>
          </p>
          <FormAlert>{error}</FormAlert>

          <div className="grow lg:hidden" />
          <div className="mt-auto grid grid-cols-2 gap-3 pt-0 lg:mt-0 lg:flex lg:flex-wrap lg:pt-3">
            <Button
              variant="outline"
              size="lg"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
              className="border-[1.5px] text-base disabled:opacity-100 disabled:text-disabled-text lg:w-auto lg:border-input lg:px-7"
            >
              Back
            </Button>
            <Button size="lg" onClick={next} disabled={pending} className="text-base lg:w-auto lg:px-9">
              {pending ? "Saving…" : last ? "Next: Terms" : "Next"}
              <ArrowRight size={18} strokeWidth={2} aria-hidden />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Progress({ step, className }: { step: number; className: string }) {
  return (
    <div className={cn("grid gap-1.5", className)} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-border")} />
      ))}
    </div>
  );
}

/* ---- Illustrations (drawn from the design files, not real data) ---- */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="rounded-[10px] bg-background px-3 py-2.5 text-sm font-semibold lg:p-3 lg:text-base">{value}</span>
    </div>
  );
}

function RequestIllustration() {
  return (
    <div aria-hidden className="flex w-full max-w-[380px] flex-col gap-3 rounded-[18px] border border-illustration-border bg-card p-[18px] lg:rounded-[20px] lg:p-[22px]">
      <span className="font-heading text-base font-bold lg:text-lg">New request</span>
      <Field label="Document" value="Lab result — HbA1c" />
      <Field label="Facility" value="[Partner facility]" />
      <Field label="Purpose" value="Follow-up consultation" />
      <span className="self-start rounded-full bg-attention px-2.5 py-1.5 text-xs font-bold text-attention-foreground">
        Release in 1–3 working days
      </span>
    </div>
  );
}

function TrackIllustration() {
  const dot = "size-[22px] flex-none rounded-full";
  return (
    <ol aria-hidden className="flex w-full max-w-[380px] flex-col gap-1 rounded-[18px] border border-illustration-border bg-card p-[18px] lg:gap-1.5 lg:rounded-[20px] lg:p-[22px]">
      <li className="flex items-center gap-3 py-1.5 lg:py-2">
        <span className={cn(dot, "bg-primary")} />
        <span className="flex-1 text-sm font-semibold lg:text-base">Submitted</span>
        <span className="text-xs text-muted-foreground lg:text-[13px]">Oct 13</span>
      </li>
      <li className="flex items-center gap-3 py-1.5 lg:py-2">
        <span className={cn(dot, "bg-primary")} />
        <span className="flex-1 text-sm font-semibold lg:text-base">Under review</span>
        <span className="text-xs text-muted-foreground lg:text-[13px]">Oct 14</span>
      </li>
      <li className="-mx-2.5 flex items-center gap-3 rounded-field bg-attention px-2.5 py-2 lg:-mx-3 lg:px-3 lg:py-2.5">
        <span className={cn(dot, "border-[6px] border-accent bg-card")} />
        <span className="flex-1 text-sm font-bold text-attention-foreground lg:text-base">Approved — preparing</span>
        <span className="text-xs text-attention-foreground lg:text-[13px]">Now</span>
      </li>
      <li className="flex items-center gap-3 py-1.5 text-muted-foreground lg:py-2">
        <span className={cn(dot, "border-2 border-input")} />
        <span className="flex-1 text-sm lg:text-base">Released</span>
        <span className="text-xs lg:text-[13px]">By Oct 16</span>
      </li>
      <li className="mt-2 flex items-center gap-2.5 rounded-field bg-foreground px-3 py-2.5 text-[13px] text-white lg:hidden">
        <Bell size={18} strokeWidth={1.8} /> You&apos;ll be notified when it&apos;s released
      </li>
    </ol>
  );
}

function ShareIllustration() {
  const items = [
    { label: "Medications", on: true },
    { label: "Allergies", on: true },
    { label: "Latest labs", on: true },
    { label: "Diagnoses", on: false },
  ];
  return (
    <div aria-hidden className="flex flex-wrap items-center justify-center gap-3.5 lg:gap-5">
      <div className="flex flex-col items-center gap-2.5 rounded-[18px] border border-illustration-border bg-card p-3.5 lg:gap-3 lg:rounded-[20px] lg:p-[18px]">
        <svg width="120" height="120" viewBox="0 0 21 21" shapeRendering="crispEdges">
          <rect width="21" height="21" fill="var(--card)" />
          <path fill="var(--foreground)" d="M0 0h7v7H0zM14 0h7v7h-7zM0 14h7v7H0z" />
          <path fill="var(--card)" d="M1 1h5v5H1zM15 1h5v5h-5zM1 15h5v5H1z" />
          <path fill="var(--foreground)" d="M2 2h3v3H2zM16 2h3v3h-3zM2 16h3v3H2zM8 0h1v2H8zM10 1h2v1h-2zM9 3h2v2H9zM12 4h1v3h-1zM8 6h2v1H8zM0 8h2v1H0zM3 8h3v1H3zM8 8h3v2H8zM13 8h2v1h-2zM17 8h4v1h-4zM1 10h2v2H1zM5 10h2v1H5zM11 11h3v1h-3zM16 10h2v3h-2zM19 11h2v1h-2zM8 12h2v2H8zM14 13h1v2h-1zM9 15h3v1H9zM16 14h3v2h-3zM8 17h2v1H8zM12 17h2v3h-2zM15 18h3v1h-3zM19 17h2v4h-2zM9 19h2v2H9zM16 20h2v1h-2z" />
        </svg>
        <span className="rounded-full bg-attention px-2.5 py-[5px] text-xs font-bold text-attention-foreground">
          Expires in 30 min
        </span>
      </div>
      <ul className="flex flex-col gap-2 text-[13px] font-semibold lg:text-sm">
        {items.map((it) => (
          <li
            key={it.label}
            className={cn("flex items-center gap-2 rounded-[10px] bg-card px-2.5 py-2 lg:px-3.5 lg:py-2.5", !it.on && "text-muted-foreground")}
          >
            <span className={cn("size-4 rounded-[4px]", it.on ? "bg-primary" : "border-2 border-disabled-text")} />
            {it.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

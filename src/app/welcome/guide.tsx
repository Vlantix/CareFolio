"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { finishOnboarding } from "./actions";

// Titles, layout and illustrations from design/Guide1-3.html (phone) and
// design/DGuide.html (desktop). The body copy is trimmed to what the MVP
// really does: lab results only, no timeline, QR sharing or caregiver
// invites yet (docs/LATER.md). Restore the design copy as those ship.
const STEPS = [
  {
    title: "Request official documents",
    mobile:
      "Request an official lab result from the hospital. Choose the patient, the test and the purpose, then submit — no trip to the records office.",
    desktop:
      "Request an official lab result from the hospital. Choose the patient, the test and the purpose, then submit — no trip to the records office.",
  },
  {
    title: "Track, then view and download",
    mobile:
      "Follow each request from Submitted to Released. Once the records office releases it, open the official PDF and download it.",
    desktop:
      "Follow each request from Submitted to Released. Once the records office releases it, open the official PDF on any device and download it.",
  },
  {
    title: "Show any doctor in seconds",
    mobile:
      "Open the official copy on your phone, or download it to print. Only you, people the records office links to you, and records staff can see it.",
    desktop:
      "Open the official copy on your phone or computer, or download it to print. Only you, people the records office links to you, and records staff can see it.",
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
    <div className="cf-enter flex flex-1 flex-col">
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

        <div className="flex h-[300px] items-center justify-center rounded-hero bg-primary-soft p-6 lg:h-auto lg:min-h-[400px] lg:flex-[1_1_420px] lg:rounded-hero-lg lg:p-10">
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
      <span className="rounded-chip bg-background px-3 py-2.5 text-sm font-semibold lg:p-3 lg:text-base">{value}</span>
    </div>
  );
}

function RequestIllustration() {
  return (
    <div aria-hidden className="flex w-full max-w-[380px] flex-col gap-3 rounded-card border border-illustration-border bg-card p-[18px] lg:rounded-card-lg lg:p-[22px]">
      <span className="font-heading text-base font-bold lg:text-lg">New request</span>
      <Field label="Document" value="Lab result — HbA1c" />
      <Field label="Facility" value="[Partner facility]" />
      <Field label="Purpose" value="Follow-up consultation" />
      <span className="self-start rounded-full bg-attention px-2.5 py-1.5 text-xs font-bold text-attention-foreground">
        Sent to the records office
      </span>
    </div>
  );
}

function TrackIllustration() {
  const dot = "size-[22px] flex-none rounded-full";
  return (
    <ol aria-hidden className="flex w-full max-w-[380px] flex-col gap-1 rounded-card border border-illustration-border bg-card p-[18px] lg:gap-1.5 lg:rounded-card-lg lg:p-[22px]">
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
    </ol>
  );
}

function ShareIllustration() {
  return (
    <div aria-hidden className="flex w-full max-w-[300px] flex-col gap-3 rounded-card border border-illustration-border bg-card p-[18px] lg:rounded-card-lg lg:p-[22px]">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-field bg-primary-soft text-primary-deep">
          <FileText size={22} strokeWidth={1.8} />
        </span>
        <span className="flex flex-col">
          <span className="font-heading text-base font-bold">Lab result — HbA1c</span>
          <span className="text-xs text-muted-foreground">[Partner facility] · Oct 16</span>
        </span>
      </div>
      <div className="flex flex-col gap-1.5 rounded-chip bg-background p-3">
        <span className="h-2 w-3/4 rounded-full bg-border" />
        <span className="h-2 w-full rounded-full bg-border" />
        <span className="h-2 w-2/3 rounded-full bg-border" />
      </div>
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-primary-soft px-2.5 py-[5px] text-xs font-bold text-primary-deep">
          Official copy
        </span>
        <span className="text-sm font-semibold text-primary">Download PDF</span>
      </div>
    </div>
  );
}

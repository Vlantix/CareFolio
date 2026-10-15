"use client";

import { useActionState, useState } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { decideRequest, releaseRequest, type DecisionState, type ReleaseState } from "./actions";

type Check = { name: string; label: string; hint: string; ok: boolean };

// design/AReview.html
export function ReviewForm({
  requestId,
  status,
  patientName,
  checks,
  defaultTitle,
}: {
  requestId: string;
  status: string;
  patientName: string;
  checks: Check[];
  defaultTitle: string;
}) {
  const [decision, setDecision] = useState<"approve" | "info" | "decline">("approve");
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [decisionState, decide, deciding] = useActionState<DecisionState, FormData>(decideRequest, {});
  const [releaseState, release, releasing] = useActionState<ReleaseState, FormData>(releaseRequest, {});
  const allChecked = checks.every((c) => ticked[c.name]);
  const approved = status === "approved";

  const pick = (d: typeof decision, label: string, danger = false) => (
    <button
      type="button"
      role="radio"
      aria-checked={decision === d}
      onClick={() => setDecision(d)}
      className={cn(
        "h-12 flex-1 rounded-field border-[1.5px] px-4 font-semibold",
        decision === d
          ? danger
            ? "border-attention-icon bg-attention-icon text-primary-foreground"
            : "border-primary bg-primary text-primary-foreground"
          : "border-input bg-card text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-start gap-5">
      <section className="flex flex-[1_1_320px] flex-col gap-3 rounded-card border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">1 · Verification</h2>
        {checks.map((c) => (
          <label key={c.name} className="flex cursor-pointer items-start gap-3 rounded-field border border-border p-3">
            <input
              type="checkbox"
              checked={!!ticked[c.name]}
              onChange={(e) => setTicked({ ...ticked, [c.name]: e.target.checked })}
              className="mt-0.5 size-5 accent-primary"
            />
            <span>
              <strong>{c.label}</strong>
              <br />
              <span className={cn("text-caption", c.ok ? "text-muted-foreground" : "font-semibold text-danger-foreground")}>
                {c.hint}
              </span>
            </span>
          </label>
        ))}
      </section>

      <section className="flex flex-[1_1_360px] flex-col gap-4 rounded-card border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-bold">2 · Decision</h2>
        <div role="radiogroup" aria-label="Decision" className="flex flex-wrap gap-2">
          {pick("approve", approved ? "Approved" : "Approve")}
          {pick("info", "Ask for info")}
          {pick("decline", "Decline", true)}
        </div>

        {(decision !== "approve" || !approved) && (
          <form action={decide} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={requestId} />
            <input type="hidden" name="decision" value={decision} />
            {decision !== "approve" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="text">
                  {decision === "info" ? "Question for the requester" : "Reason for declining"}{" "}
                  <span className="font-normal text-muted-foreground">(required — the requester will see this)</span>
                </Label>
                <Textarea id="text" name="text" rows={3} maxLength={500} required />
              </div>
            )}
            <FormAlert>{decisionState.error}</FormAlert>
            <FormAlert tone="info">{decisionState.ok}</FormAlert>
            <Button
              type="submit"
              disabled={deciding}
              className={cn(decision === "decline" && "bg-attention-icon hover:bg-attention-foreground")}
            >
              {decision === "approve" ? "Approve request" : decision === "info" ? "Send question to requester" : "Decline with reason"}
            </Button>
          </form>
        )}

        {decision === "approve" && approved && (
          <form action={release} className="flex flex-col gap-3 border-t border-divider pt-4">
            <h3 className="font-heading text-base font-bold">3 · Release document</h3>
            <input type="hidden" name="id" value={requestId} />
            {checks.map((c) => (
              <input key={c.name} type="hidden" name={c.name} value={ticked[c.name] ? "on" : ""} />
            ))}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="file">Official PDF <span className="font-normal text-muted-foreground">(4 MB max)</span></Label>
              <label className="flex cursor-pointer items-center gap-3 rounded-field border-[1.5px] border-dashed border-disabled-text p-3">
                <FileUp size={22} aria-hidden className="text-primary" />
                <input id="file" name="file" type="file" accept="application/pdf" required className="min-w-0 text-sm" />
              </label>
            </div>
            <InputField id="title" name="title" label="Title" defaultValue={defaultTitle} required />
            <div className="grid grid-cols-2 gap-2.5">
              <InputField id="doctor" name="doctor" label="Doctor (optional)" />
              <InputField id="record_date" name="record_date" type="date" label="Record date" required />
            </div>
            <p className="rounded-field bg-background px-3 py-2.5 text-caption text-muted-foreground">
              A unique verification code (CF-XXXX-XXXX) is generated and stamped on every page with
              &ldquo;Verify at …/verify-document&rdquo;.
            </p>
            <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                name="confirm_patient"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 size-5 accent-primary"
              />
              I confirm this document belongs to {patientName} and is going to the correct patient&apos;s account.
            </label>
            <FormAlert>{releaseState.error}</FormAlert>
            <Button
              type="submit"
              size="lg"
              disabled={!allChecked || !confirmed || releasing}
              className="disabled:bg-input disabled:text-muted-foreground disabled:opacity-100"
            >
              {releasing ? "Releasing…" : "Release to patient account"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

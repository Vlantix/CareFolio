"use client";

import { useActionState } from "react";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { mediumDate } from "@/lib/dates";
import { checkCode, type VerifyResult } from "./actions";

const MESSAGES: Record<string, string> = {
  invalid: "Codes look like CF-7Q4K-92XM. Check the code and try again.",
  not_found: "No document found with this code. Check it carefully — a wrong code may mean the document isn't genuine.",
  rate_limited: "Too many checks from this connection. Please wait a few minutes and try again.",
  error: "We couldn't check the code right now. Please try again.",
};

// design/MVerifyDoc.html
export function VerifyForm() {
  const [result, action, pending] = useActionState<VerifyResult, FormData>(checkCode, { status: "idle" });
  const code = result.status === "idle" ? "" : result.code;

  return (
    <>
      <form action={action} className="flex flex-col gap-1.5">
        <Label htmlFor="code">Verification code</Label>
        <div className="flex gap-2">
          <input
            id="code"
            name="code"
            defaultValue={code}
            placeholder="CF-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="h-13 min-w-0 flex-1 rounded-field border-[1.5px] border-input bg-card px-3.5 font-heading text-lg tracking-[0.06em] uppercase focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
          <Button type="submit" disabled={pending} className="h-13 px-5">
            {pending ? "Checking…" : "Check"}
          </Button>
        </div>
      </form>

      <section aria-live="polite">
        {result.status === "authentic" && (
          <div className="flex flex-col gap-3.5 rounded-card-lg border-2 border-primary bg-card p-4.5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <BadgeCheck size={24} aria-hidden />
              </span>
              <span className="flex flex-col">
                <strong className="text-lg">Authentic and unaltered</strong>
                <span className="text-caption text-muted-foreground">Matches the facility&apos;s original</span>
              </span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Document</dt>
              <dd className="font-semibold">{result.type}</dd>
              <dt className="text-muted-foreground">Patient</dt>
              <dd className="font-semibold">{result.patient}</dd>
              <dt className="text-muted-foreground">Issued by</dt>
              <dd className="font-semibold">{result.facility} Records Office</dd>
              <dt className="text-muted-foreground">Released</dt>
              <dd className="font-semibold">
                {mediumDate(result.released_at)}
              </dd>
            </dl>
          </div>
        )}
        {result.status !== "idle" && result.status !== "authentic" && (
          <div role="alert" className="flex items-start gap-3 rounded-card-lg border-2 border-danger-foreground bg-danger p-4 text-danger-foreground">
            <CircleAlert size={22} aria-hidden className="mt-0.5 shrink-0" />
            <p className="text-sm font-semibold">{MESSAGES[result.status]}</p>
          </div>
        )}
      </section>
    </>
  );
}

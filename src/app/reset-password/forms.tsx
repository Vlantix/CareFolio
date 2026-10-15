"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { InputField } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";
import {
  requestReset,
  verifyResetCode,
  setNewPassword,
  type ResetState,
  type VerifyResetState,
} from "./actions";

// `useRef` is only used for the OTP digit boxes below.

// ── Step 1 + 2: email form → OTP form ──────────────────────────────────────

export function RequestResetForm() {
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [state, action, pending] = useActionState<ResetState, FormData>(requestReset, {});

  if (state.sent && sentEmail) {
    return <VerifyResetCodeForm email={sentEmail} onRestart={() => setSentEmail(null)} />;
  }

  return (
    <form
      action={(fd) => {
        // Capture the email in client state so the next step can use it.
        setSentEmail(String(fd.get("email") ?? "").trim());
        return action(fd);
      }}
      noValidate
      className="flex flex-col gap-5"
    >
      <FormAlert>{state.error}</FormAlert>
      <InputField
        id="email"
        name="email"
        type="email"
        label="Email address"
        placeholder="you@example.com"
        autoComplete="email"
        required
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Email me a 6-digit code"}
      </Button>
    </form>
  );
}

// ── Step 2: enter the OTP ───────────────────────────────────────────────────

function VerifyResetCodeForm({
  email,
  onRestart,
}: {
  email: string;
  onRestart: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [state, action, pending] = useActionState<VerifyResetState, FormData>(
    verifyResetCode,
    {},
  );
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join("");

  function fill(start: number, text: string) {
    const incoming = text.replace(/\D/g, "").slice(0, 6 - start).split("");
    if (!incoming.length) return;
    const next = [...digits];
    incoming.forEach((d, i) => (next[start + i] = d));
    setDigits(next);
    boxes.current[Math.min(start + incoming.length, 5)]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      boxes.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      boxes.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      boxes.current[i + 1]?.focus();
    }
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {/* Hidden fields carry the email and the assembled code. */}
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="code" value={code} />

      <p className="text-sm leading-relaxed text-muted-foreground">
        We sent a 6-digit code to <strong className="text-foreground">{email}</strong>. Check
        your inbox and spam folder.
      </p>

      <FormAlert>{state.error}</FormAlert>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2.5 text-sm font-semibold">Verification code</legend>
        <div className="grid grid-cols-6 gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              aria-label={`Digit ${i + 1}`}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              pattern="[0-9]*"
              maxLength={i === 0 ? 6 : 1}
              value={d}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  const next = [...digits];
                  next[i] = "";
                  setDigits(next);
                } else {
                  fill(i, v.length > 1 ? v.slice(d ? 1 : 0) : v);
                }
              }}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={(e) => {
                e.preventDefault();
                fill(i, e.clipboardData.getData("text"));
              }}
              onFocus={(e) => e.target.select()}
              className={cn(
                "h-[60px] min-w-0 rounded-field border-[1.5px] bg-card text-center font-heading text-2xl font-bold text-foreground",
                "focus:border-[2.5px] focus:border-accent focus:outline-none",
                d ? "border-primary" : "border-input",
              )}
            />
          ))}
        </div>
      </fieldset>

      <Button type="submit" size="lg" disabled={pending || code.length !== 6}>
        {pending ? "Checking…" : "Verify code"}
      </Button>

      <button
        type="button"
        onClick={onRestart}
        className="text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        Use a different email
      </button>
    </form>
  );
}

// ── Step 3: choose a new password ──────────────────────────────────────────

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(setNewPassword, {});
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormAlert>{state.error}</FormAlert>
      <PasswordInput
        id="password"
        name="password"
        label="New password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        required
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}

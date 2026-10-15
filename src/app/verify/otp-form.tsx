"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { cn } from "@/lib/utils";
import { sendCode, verifyCode, type VerifyState } from "./actions";

const COOLDOWN = 60;

/** Six digit boxes + resend timer (design/Otp.html, DVerify.html). */
export function OtpForm({
  loginId,
  lockedUntil: lockedOnArrival,
}: {
  loginId: string;
  /** When code entry unlocks, if too many wrong codes locked it. */
  lockedUntil?: string;
}) {
  // One timer per login, so logging in again always sends a fresh code.
  const SENT_KEY = `cf_code_sent_at:${loginId}`;
  const [state, action, pending] = useActionState<VerifyState, FormData>(verifyCode, {});
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sendError, setSendError] = useState<string>();
  const [sending, setSending] = useState(false);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const autoSent = useRef(false);

  async function send() {
    setSending(true);
    setSendError(undefined);
    const result = await sendCode();
    setSending(false);
    if (result.error) setSendError(result.error);
    // The server says how long to wait when a limit is hit; otherwise
    // start the normal one-minute timer.
    const wait = result.waitSeconds ?? COOLDOWN;
    try {
      sessionStorage.setItem(SENT_KEY, String(Date.now() - (COOLDOWN - wait) * 1000));
    } catch {}
    setSecondsLeft(wait);
  }

  // Send the code automatically on arrival — but not again if the page
  // was just reloaded inside the cooldown.
  useEffect(() => {
    if (autoSent.current || lockedOnArrival) return;
    autoSent.current = true;
    let sentAt = 0;
    try {
      sentAt = Number(sessionStorage.getItem(SENT_KEY) ?? 0);
    } catch {}
    const waited = Math.floor((Date.now() - sentAt) / 1000);
    if (waited < COOLDOWN) {
      setSecondsLeft(COOLDOWN - waited);
    } else {
      void send();
    }
    boxes.current[0]?.focus();
    // Runs once on arrival only; re-running would send a second code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  function fill(start: number, text: string) {
    const incoming = text.replace(/\D/g, "").slice(0, 6 - start).split("");
    if (incoming.length === 0) return;
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

  const code = digits.join("");
  // Locked on arrival, or by the wrong code just entered — and unlocked
  // again automatically when the time passes (no reload needed).
  const lockedUntil = state.lockedUntil ?? lockedOnArrival;
  const locked = useLockedUntil(lockedUntil);
  const lockedText = lockedUntil
    ? `Too many wrong codes. You can try again at ${new Intl.DateTimeFormat("en-PH", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      }).format(new Date(lockedUntil))}.`
    : undefined;
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <form action={action} className="flex flex-col gap-[18px]">
      <input type="hidden" name="token" value={code} />
      {locked ? (
        <FormAlert>{lockedText}</FormAlert>
      ) : lockedUntil ? (
        <FormAlert tone="info">You can try again now. Send a new code below.</FormAlert>
      ) : (
        <FormAlert>{state.error ?? sendError}</FormAlert>
      )}

      <fieldset className="flex flex-col gap-3" disabled={locked}>
        <legend className="mb-2.5 text-sm font-semibold">Verification code</legend>
        <div className="grid grid-cols-6 gap-2 lg:gap-2.5">
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
                  // Typing one digit, or the phone auto-filling all six.
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
                "h-[60px] min-w-0 rounded-field disabled:opacity-50 border-[1.5px] bg-card text-center font-heading text-2xl font-bold text-foreground lg:h-16 lg:text-[26px]",
                "focus:border-[2.5px] focus:border-accent focus:outline-none",
                d ? "border-primary" : "border-input",
              )}
            />
          ))}
        </div>
      </fieldset>

      <p className={cn("text-sm text-muted-foreground", locked && "hidden")} aria-live="polite">
        Didn&apos;t get it? Check your spam folder
        {secondsLeft > 0 ? (
          <>
            , or resend in{" "}
            <strong className="text-foreground">
              {mm}:{ss}
            </strong>
          </>
        ) : (
          <>
            , or{" "}
            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="min-h-11 font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50"
            >
              {sending ? "sending…" : "send a new code"}
            </button>
          </>
        )}
        .
      </p>

      <Button type="submit" size="lg" disabled={locked || pending || code.length !== 6}>
        {pending ? "Checking…" : "Verify code"}
      </Button>
    </form>
  );
}

/** True until `until` (an ISO time) has passed; re-checks every second. */
function useLockedUntil(until: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  const end = until ? new Date(until).getTime() : 0;
  const locked = end > now;
  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [locked]);
  return locked;
}

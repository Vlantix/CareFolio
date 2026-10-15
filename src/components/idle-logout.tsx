"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions/logout";

const WARN_AFTER = 14 * 60 * 1000; // show the warning
const LOGOUT_AFTER = 15 * 60 * 1000; // log out
const ACTIVITY = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"] as const;

/**
 * Health records shouldn't stay open on an unattended phone or a shared
 * computer. After 14 minutes with no input this shows a warning; at 15
 * it logs out (Supabase login + email-code cookie) and goes to the log
 * in page with a short notice.
 */
export function IdleLogout({ staff = false }: { staff?: boolean }) {
  const lastActivity = useRef(0); // set when the timer starts
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const stayButton = useRef<HTMLButtonElement>(null);
  const loggingOut = useRef(false);
  // Lets the activity listener read the latest value without re-subscribing.
  const secondsLeftRef = useRef<number | null>(null);

  useEffect(() => {
    // Any input counts as "still here" — but once the warning is up,
    // only the button does, so a stray mouse nudge can't hide it.
    lastActivity.current = Date.now();
    const onActivity = () => {
      if (secondsLeftRef.current === null) lastActivity.current = Date.now();
    };
    ACTIVITY.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const timer = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= LOGOUT_AFTER) {
        if (loggingOut.current) return;
        loggingOut.current = true;
        const form = new FormData();
        form.set("reason", "idle");
        if (staff) form.set("to", "staff");
        void logout(form);
      } else if (idle >= WARN_AFTER) {
        setSecondsLeft(Math.ceil((LOGOUT_AFTER - idle) / 1000));
      } else {
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      ACTIVITY.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(timer);
    };
  }, [staff]);

  useEffect(() => {
    const wasHidden = secondsLeftRef.current === null;
    secondsLeftRef.current = secondsLeft;
    if (secondsLeft !== null && wasHidden) stayButton.current?.focus();
  }, [secondsLeft]);

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex print:hidden items-end justify-center bg-foreground/40 p-4 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        aria-describedby="idle-body"
        className="flex w-full max-w-[400px] flex-col gap-4 rounded-panel bg-card p-6"
      >
        <h2 id="idle-title" className="font-heading text-xl font-bold">
          Still there?
        </h2>
        <p id="idle-body" className="text-[15px] text-muted-foreground">
          You&apos;ll be logged out in{" "}
          <strong className="text-foreground">{secondsLeft} seconds</strong> to keep
          your health records private.
        </p>
        <Button
          ref={stayButton}
          size="lg"
          onClick={() => {
            lastActivity.current = Date.now();
            setSecondsLeft(null);
          }}
        >
          Stay logged in
        </Button>
      </div>
    </div>
  );
}

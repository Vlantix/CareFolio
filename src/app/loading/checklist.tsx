"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { runLoadingStep } from "./actions";

// Each line stays on screen at least this long, so a fast connection
// still shows the ticks happening one by one.
const MIN_STEP_MS = 350;

export function LoadingChecklist({ labels }: { labels: { mobile: string; desktop: string }[] }) {
  const router = useRouter();
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      for (let step = 0; step < labels.length; step++) {
        const [result] = await Promise.all([
          runLoadingStep(step),
          new Promise((r) => setTimeout(r, MIN_STEP_MS)),
        ]);
        if (!result.ok) {
          if (result.next) return router.replace(result.next);
          return setFailed(true);
        }
        setDone(step + 1);
        if (result.next) return router.replace(result.next);
      }
    })();
  }, [labels.length, router]);

  const percent = Math.round((done / labels.length) * 100);

  return (
    <>
      <div
        role="progressbar"
        aria-label="Loading progress"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-border"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul
        aria-live="polite"
        className="flex w-full flex-col gap-3.5 rounded-[18px] border border-border bg-card p-[18px] text-[15px] lg:grid lg:grid-cols-2 lg:gap-4 lg:rounded-[20px] lg:p-[22px]"
      >
        {labels.map((label, i) => {
          const state = i < done ? "done" : i === done && !failed ? "working" : "waiting";
          return (
            <li
              key={label.mobile}
              className={cn(
                "flex items-center gap-3",
                state === "working" && "font-semibold",
                state === "waiting" && "text-muted-foreground",
              )}
            >
              {state === "done" ? (
                <span className="flex size-6 flex-none items-center justify-center rounded-full bg-primary text-white">
                  <Check size={14} strokeWidth={3} aria-hidden />
                </span>
              ) : state === "working" ? (
                <span className="cf-spin size-6 flex-none rounded-full border-[3px] border-attention-ring border-t-accent" />
              ) : (
                <span className="size-6 flex-none rounded-full border-2 border-input" />
              )}
              <span className="lg:hidden">{label.mobile}</span>
              <span className="hidden lg:inline">{label.desktop}</span>
              <span className="sr-only">{state === "done" ? " — done" : state === "working" ? " — in progress" : ""}</span>
            </li>
          );
        })}
      </ul>

      {failed ? (
        <p role="alert" className="text-sm font-semibold text-danger-foreground">
          Something went wrong.{" "}
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 underline">
            Try again
          </button>
        </p>
      ) : (
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground lg:text-sm">
          <Lock size={16} strokeWidth={2} aria-hidden /> Encrypted connection
        </p>
      )}
    </>
  );
}

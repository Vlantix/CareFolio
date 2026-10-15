"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { logHidden, logSummaryPrinted, type HiddenReason } from "@/app/actions/records";
import { stampTime } from "@/lib/dates";

/*
 * PROTECTED VIEW — read this before relying on it.
 *
 * A web page CANNOT block screenshots, and cannot reliably detect them:
 * phones never tell the browser, and desktop shortcuts are only
 * sometimes reported. Someone can always photograph the screen with
 * another phone. So this is a DETERRENT plus TRACEABILITY, not a lock:
 *   - the record blurs whenever the window loses focus, the tab or app
 *     is switched, Print Screen / a Mac screenshot shortcut is reported,
 *     or printing starts;
 *   - every view carries a watermark with the viewer's name, masked
 *     email and the time, so any copy that leaks points back to them;
 *   - downloaded PDFs are stamped the same way (the download route);
 *   - each "hidden" event is written to the audit log.
 * The real protection is still access control: RLS and audit.
 */

const REASON_TEXT: Record<HiddenReason, string> = {
  window_blur: "You left the CareFolio window.",
  tab_hidden: "You switched to another app or tab.",
  print_screen: "Screenshots are not allowed in protected view.",
  print: "Printing is not allowed in protected view.",
};

type Ctx = { printWatermarked: () => void };
const PrintContext = createContext<Ctx>({ printWatermarked: () => {} });
/** For the summary's own "Print PDF" button — the only allowed print. */
export const useProtectedPrint = () => useContext(PrintContext);

export function ProtectedView({
  viewerName,
  viewerEmail,
  patientId,
  documentId = null,
  className,
  children,
}: {
  viewerName: string;
  /** Already masked, e.g. m••••@gmail.com */
  viewerEmail: string;
  patientId: string;
  documentId?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState<HiddenReason | null>(null);
  const [stamp, setStamp] = useState(() => watermarkTime());
  const keepButton = useRef<HTMLButtonElement>(null);
  const printing = useRef(false);
  const lastLogged = useRef(0);

  const hide = useCallback(
    (reason: HiddenReason) => {
      setHidden(reason);
      // The database also limits this to once a minute; this just saves calls.
      if (Date.now() - lastLogged.current > 60_000) {
        lastLogged.current = Date.now();
        void logHidden(patientId, documentId, reason);
      }
    },
    [patientId, documentId],
  );

  useEffect(() => {
    const onBlur = () => hide("window_blur");
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hide("tab_hidden");
    };
    const onKey = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      if (key === "printscreen") hide("print_screen");
      else if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(key)) hide("print_screen");
      else if ((e.ctrlKey || e.metaKey) && key === "p") {
        e.preventDefault();
        hide("print");
      }
    };
    const onBeforePrint = () => {
      if (!printing.current) hide("print");
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("beforeprint", onBeforePrint);
    // The watermark's time is kept current.
    const tick = setInterval(() => setStamp(watermarkTime()), 60_000);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("beforeprint", onBeforePrint);
      clearInterval(tick);
    };
  }, [hide]);

  // The overlay is an alertdialog: move focus to its button.
  useEffect(() => {
    if (hidden) keepButton.current?.focus();
  }, [hidden]);

  const printWatermarked = useCallback(() => {
    printing.current = true;
    setStamp(watermarkTime());
    document.body.classList.add("cf-print-allowed");
    void logSummaryPrinted(patientId);
    const done = () => {
      document.body.classList.remove("cf-print-allowed");
      printing.current = false;
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    // Let React paint the fresh watermark time first.
    requestAnimationFrame(() => window.print());
  }, [patientId]);

  const line = `${viewerName} · ${viewerEmail} · ${stamp} · CareFolio`;

  return (
    <PrintContext.Provider value={{ printWatermarked }}>
      <div className={cn("relative", className)}>
        {/* overflow-hidden is load-bearing: the watermark layer is much
            bigger than the content and would otherwise make phones scroll
            sideways. */}
        <div
          className={cn(
            "cf-protected relative overflow-hidden select-none motion-safe:transition-[filter] motion-safe:duration-200",
            hidden && "blur-[18px]",
          )}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          aria-hidden={hidden ? true : undefined}
        >
          {children}
          {/* Diagonal watermark over the content; clicks pass through. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-[60%] flex -rotate-[24deg] flex-col gap-[30px] text-xs font-bold text-primary/[0.13] print:text-primary/20"
          >
            {Array.from({ length: 18 }, (_, row) => (
              <div key={row} className="flex gap-10 whitespace-nowrap">
                {[0, 1, 2].map((i) => (
                  <span key={i}>{line}</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {hidden && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="pv-title"
            aria-describedby="pv-reason"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3.5 rounded-button bg-navy/55 p-6 text-center print:hidden"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-card text-navy">
              <EyeOff size={26} strokeWidth={1.8} aria-hidden />
            </span>
            <strong id="pv-title" className="font-heading text-xl text-primary-foreground">
              Hidden to protect this record
            </strong>
            <span id="pv-reason" className="max-w-[280px] text-sm leading-[1.45] text-primary-soft">
              {REASON_TEXT[hidden]}
            </span>
            <button
              ref={keepButton}
              type="button"
              onClick={() => setHidden(null)}
              className="h-12 rounded-field bg-card px-[22px] text-ui font-bold text-navy hover:bg-primary-soft"
            >
              Tap to keep viewing
            </button>
          </div>
        )}
      </div>
    </PrintContext.Provider>
  );
}

function watermarkTime() {
  return stampTime(new Date());
}

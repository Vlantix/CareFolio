"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Draws a PDF as page images on <canvas> (pdfjs-dist), instead of
 * embedding a raw PDF link that a browser would offer to save. `src` is
 * our own server route, which checks access and redirects to a
 * 60-second signed link.
 */
export function PdfCanvas({ src, title }: { src: string; title: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        // Same-site cookies reach our route; the signed link needs none.
        const pdf = await pdfjs.getDocument({ url: src }).promise;
        const el = holder.current;
        if (!el || cancelled) return;
        el.replaceChildren();
        const width = el.clientWidth || 600;
        const ratio = window.devicePixelRatio || 1;
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.display = "block";
          canvas.setAttribute("aria-hidden", "true");
          el.appendChild(canvas);
          await page.render({ canvas, viewport }).promise;
        }
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className="bg-card">
      <div ref={holder} role="img" aria-label={`${title} (official document)`} className="flex flex-col gap-2" />
      {state === "loading" && <p className="p-6 text-sm text-muted-foreground">Opening the document…</p>}
      {state === "error" && (
        <p role="alert" className="p-6 text-sm font-semibold text-danger-foreground">
          We couldn&apos;t open this document. Go back and try again.
        </p>
      )}
    </div>
  );
}

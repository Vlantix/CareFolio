"use client";

import { useEffect, useState } from "react";
import { CloudOff, Download } from "lucide-react";
import { stampTime } from "@/lib/dates";

const SAVED_AT = "cf_summary_saved_at";
const SUMMARY_CACHE = "cf-summary-v1";

type InstallEvent = Event & { prompt: () => Promise<void> };
declare global {
  interface Window {
    __cfInstall?: InstallEvent;
  }
}

/**
 * Registers the service worker (public/sw.js) and remembers the browser's
 * "you can install this app" offer for the Install button. Mounted once
 * in the root layout.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onOffer = (e: Event) => {
      e.preventDefault();
      window.__cfInstall = e as InstallEvent;
      window.dispatchEvent(new Event("cf-install-available"));
    };
    window.addEventListener("beforeinstallprompt", onOffer);
    return () => window.removeEventListener("beforeinstallprompt", onOffer);
  }, []);
  return null;
}

/** Shown only when the browser offers installation. */
export function InstallButton() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const update = () => setAvailable(!!window.__cfInstall);
    update();
    window.addEventListener("cf-install-available", update);
    return () => window.removeEventListener("cf-install-available", update);
  }, []);
  if (!available) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await window.__cfInstall?.prompt();
        window.__cfInstall = undefined;
        setAvailable(false);
      }}
      className="flex min-h-11 items-center gap-2 self-start rounded-field border-[1.5px] border-primary px-4 text-sm font-bold text-primary"
    >
      <Download size={18} aria-hidden /> Install the CareFolio app
    </button>
  );
}

/**
 * On the summary: remembers when this device last loaded it online, and
 * when offline shows "Last updated <time>, offline copy".
 */
export function OfflineSummaryBanner() {
  const [offlineSince, setOfflineSince] = useState<string | null>(null);
  useEffect(() => {
    const check = () => {
      if (navigator.onLine) {
        try {
          localStorage.setItem(SAVED_AT, new Date().toISOString());
        } catch {}
        setOfflineSince(null);
      } else {
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(SAVED_AT);
        } catch {}
        setOfflineSince(saved ?? "");
      }
    };
    check();
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, []);
  if (offlineSince === null) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-field bg-attention px-3.5 py-3 text-sm font-semibold text-attention-foreground print:hidden">
      <CloudOff size={18} aria-hidden />
      {offlineSince ? `Last updated ${stampTime(offlineSince)}, offline copy` : "Offline copy"}
    </p>
  );
}

/**
 * On the log in pages (where every log out lands): delete this device's
 * offline summary so the next person can't open it.
 */
export function ClearOfflineCopy() {
  useEffect(() => {
    try {
      localStorage.removeItem(SAVED_AT);
    } catch {}
    if ("caches" in window) void caches.delete(SUMMARY_CACHE);
    navigator.serviceWorker?.controller?.postMessage("clear-offline-copy");
  }, []);
  return null;
}

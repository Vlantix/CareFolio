"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SPLASH_SEEN_KEY } from "@/lib/splash";


const FADE_AT_MS = 3000; // the bar has filled: start fading out
const FADE_MS = 200;
const REDUCED_MS = 600; // prefers-reduced-motion: static logo, no fade

/**
 * The opening animation (design/Splash.html, DSplash.html), shown at most
 * once per browser session. It sits OVER the first page, which loads
 * and routes underneath as normal (log in, /verify or /home), so it
 * never delays anything. A tiny script in layout.tsx hides it before
 * the first paint when it has already been seen.
 */
export function Splash() {
  const [phase, setPhase] = useState<"showing" | "leaving" | "gone">("showing");
  // A doctor opening a shared link, or someone checking a code, should
  // see the page straight away.
  const skip = /^\/(s\/|verify-document)/.test(usePathname());

  useEffect(() => {
    try {
      // Already seen: the cf-splash-seen class keeps it hidden.
      if (sessionStorage.getItem(SPLASH_SEEN_KEY)) return;
      sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {}
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const t = setTimeout(() => setPhase("gone"), REDUCED_MS);
      return () => clearTimeout(t);
    }
    const fade = setTimeout(() => setPhase("leaving"), FADE_AT_MS);
    const gone = setTimeout(() => setPhase("gone"), FADE_AT_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, []);

  if (phase === "gone" || skip) return null;

  return (
    <div
      className={`cf-splash ${phase === "leaving" ? "cf-splash-leaving" : ""} fixed inset-0 z-[100] flex flex-col items-center gap-7 overflow-hidden bg-navy px-7 pt-12 pb-8 text-primary-foreground lg:gap-8 lg:px-6 lg:pt-14 lg:pb-10`}
      aria-hidden
    >
      <div className="grow" />
      <div className="flex items-center gap-[11px] lg:gap-[17px]">
        <div className="relative size-[88px] flex-none lg:size-[140px]">
          <span className="cf-glow absolute inset-0 rounded-full bg-splash-teal" />
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={140}
            height={140}
            priority
            className="cf-mark relative block size-[88px] rounded-[18px] lg:size-[140px] lg:rounded-[28px]"
          />
        </div>
        <Image
          src="/brand/logo-word.png"
          alt=""
          width={276}
          height={77}
          priority
          className="cf-word block h-[53px] w-[190px] lg:h-[77px] lg:w-[276px]"
        />
      </div>
      <p className="cf-tag text-center text-base leading-[1.4] text-splash-tag">
        Every record. One folder. Any doctor.
      </p>
      <div className="h-1 w-[220px] max-w-[80%] overflow-hidden rounded-full bg-navy-track">
        <div className="cf-bar h-full rounded-full bg-splash-teal" />
      </div>
      <div className="grow" />
    </div>
  );
}

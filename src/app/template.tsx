"use client";

import { usePathname } from "next/navigation";

// Every page enters with a 0.4s fade + 10px rise (design/README.md; the
// .cf-enter animation in globals.css, off under prefers-reduced-motion).
// Keying on the address replays it on every page change — including
// between pages that share a layout, like Home and Devices.
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="cf-enter flex min-h-full flex-1 flex-col">
      {children}
    </div>
  );
}

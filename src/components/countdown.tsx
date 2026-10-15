"use client";

import { useEffect, useState } from "react";

/** "Expires in 28:41" — ticks every second; "Expired" at zero. */
export function Countdown({ until, prefix = "Expires in" }: { until: string; prefix?: string }) {
  const end = new Date(until).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.floor((end - now) / 1000));
  // The server's render is a second or two behind the browser's; that
  // difference is expected, so React shouldn't warn about it.
  if (left === 0) return <span suppressHydrationWarning>Expired</span>;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = String(left % 60).padStart(2, "0");
  return (
    <span suppressHydrationWarning>
      {prefix} {h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`}
    </span>
  );
}

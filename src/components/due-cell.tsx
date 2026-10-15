"use client";

import { useEffect, useState } from "react";
import { dueLabel } from "@/lib/records";
import { cn } from "@/lib/utils";

/** Live "1d 6h" / "4h left" / "Overdue 1d" — updates every minute. */
export function DueCell({ dueAt, urgent }: { dueAt: string | null; urgent: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const { text, overdue } = dueLabel(dueAt, now);
  return (
    <span suppressHydrationWarning className={cn("whitespace-nowrap", overdue && "font-extrabold text-attention-foreground")}>
      {urgent && (
        <span className="mr-1.5 rounded-md bg-attention-icon px-2 py-0.5 text-tiny font-bold text-primary-foreground">URGENT</span>
      )}
      {text}
    </span>
  );
}

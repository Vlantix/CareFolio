"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Bell with the unread count. Updates live through Supabase Realtime
 * (RLS decides which rows this user may receive). If Realtime isn't
 * available, it re-counts whenever the window regains focus.
 */
export function LiveBell({
  userId,
  initialCount,
  href = "/notifications",
  className,
}: {
  userId: string;
  initialCount: number;
  /** Where the bell opens (staff: /admin/notifications). */
  href?: string;
  className?: string;
}) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const recount = async () => {
      const { count: unread, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (active && !error && unread !== null) setCount(unread);
    };

    const channel = supabase
      .channel(`notifications:${userId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `profile_id=eq.${userId}` },
        () => void recount(),
      )
      .subscribe();

    const onFocus = () => void recount();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link
      href={href}
      aria-label={count > 0 ? `Notifications, ${count} new` : "Notifications"}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-field border border-border bg-card text-foreground hover:bg-primary-soft hover:text-foreground md:size-12",
        className,
      )}
    >
      <Bell size={20} strokeWidth={1.8} aria-hidden />
      {count > 0 && (
        <span className="absolute top-2 right-2 size-[9px] rounded-full border-2 border-card bg-accent md:top-2.5 md:right-[11px]" />
      )}
    </Link>
  );
}

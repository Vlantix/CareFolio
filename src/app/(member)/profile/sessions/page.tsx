import { MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { getAuthState, requireMember } from "@/lib/auth";
import { revokeDevice, revokeOtherDevices } from "./actions";

export const metadata = { title: "Devices · CareFolio" };

type Session = {
  id: string;
  device_label: string;
  created_at: string;
  last_seen_at: string;
};

/** Sessions older than 12 hours no longer count (same as the cookie). */
function twelveHoursAgo() {
  return new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
}

function when(iso: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

// No design file for this screen; it is built from the shared blocks
// (PageHeader, Card, Button) in the style of design/MFamily.html.
export default async function SessionsPage() {
  await requireMember();
  const { sessionId: current } = await getAuthState();

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_sessions")
    .select("id, device_label, created_at, last_seen_at")
    .is("revoked_at", null)
    .gt("created_at", twelveHoursAgo())
    .order("last_seen_at", { ascending: false });
  const sessions = (data ?? []) as Session[];
  // This device first.
  sessions.sort((a, b) => Number(b.id === current) - Number(a.id === current));
  const others = sessions.filter((s) => s.id !== current).length;

  return (
    <main className="flex flex-col gap-4 px-5 pt-5 pb-6 md:max-w-3xl md:gap-6 md:px-10 md:py-8">
      <PageHeader title="Devices" backHref="/home" backLabel="Back to home" />
      <p className="text-[15px] text-muted-foreground">
        Where your account is logged in right now. If you don&apos;t recognise a
        device, log it out.
      </p>

      <ul className="flex flex-col gap-2.5">
        {sessions.map((s) => {
          const isThis = s.id === current;
          return (
            <li key={s.id}>
              <Card className="flex items-center gap-3 rounded-tile p-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-field bg-primary-soft text-primary-deep">
                  <MonitorSmartphone size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                    {s.device_label}
                    {isThis && (
                      <span className="rounded-full bg-primary-soft px-2.5 py-[3px] text-xs font-bold text-primary-deep">
                        This device
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    Logged in {when(s.created_at)} · last active {when(s.last_seen_at)}
                  </span>
                </span>
                <form action={revokeDevice}>
                  <input type="hidden" name="sessionId" value={s.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Log out
                  </Button>
                </form>
              </Card>
            </li>
          );
        })}
      </ul>

      {others > 0 && (
        <form action={revokeOtherDevices}>
          <Button type="submit" variant="destructive" size="lg">
            Log out all other devices
          </Button>
        </form>
      )}
    </main>
  );
}

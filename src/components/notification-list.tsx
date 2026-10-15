import Link from "next/link";
import { AlertTriangle, Bell, FileCheck2, MessageCircleQuestion, MonitorSmartphone } from "lucide-react";
import { FormAlert } from "@/components/ui/form-alert";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { dayKey, shortDate, timeOfDay } from "@/lib/dates";
import { markAllRead } from "@/app/actions/notifications";

type Notice = { id: string; kind: string | null; title: string; body: string; link: string | null; read_at: string | null; created_at: string };

const when = (iso: string, today: boolean) => (today ? timeOfDay(iso) : shortDate(iso));

/** Icon + colours per kind of notice (design/MNotifications.html). */
function look(n: Pick<Notice, "kind" | "title">) {
  if (n.kind === "document_released") return { Icon: FileCheck2, box: "bg-primary text-primary-foreground" };
  if (n.kind === "new_login") return { Icon: MonitorSmartphone, box: "bg-info text-info-foreground" };
  if (n.kind === "staff_alert") return { Icon: AlertTriangle, box: "bg-attention text-attention-icon" };
  // Request updates: a question or a decline needs attention.
  if (n.title === "More information needed" || n.title === "Request declined")
    return { Icon: MessageCircleQuestion, box: "bg-attention text-attention-icon" };
  return { Icon: Bell, box: "bg-primary-soft text-primary" };
}

/**
 * The notifications list (design/MNotifications.html), used by both the
 * patient app (/notifications) and the staff area (/admin/notifications).
 */
export async function NotificationList({ backHref, error }: { backHref: string; error?: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const notices = (data ?? []) as Notice[];
  const today = dayKey(new Date());
  const groups = [
    { label: "Today", items: notices.filter((n) => dayKey(new Date(n.created_at)) === today) },
    { label: "Earlier", items: notices.filter((n) => dayKey(new Date(n.created_at)) !== today) },
  ].filter((g) => g.items.length > 0);
  const unread = notices.some((n) => !n.read_at);

  return (
    <main className="flex flex-col gap-4 px-5 pt-5 pb-6 md:max-w-3xl md:px-10 md:py-8">
      <PageHeader
        title="Notifications"
        backHref={backHref}
        backLabel="Back"
        action={
          unread ? (
            <form action={markAllRead}>
              <input type="hidden" name="back" value={backHref === "/admin" ? "staff" : "member"} />
              <button type="submit" className="h-11 px-2.5 text-sm font-semibold text-primary hover:text-primary-hover">
                Mark all read
              </button>
            </form>
          ) : null
        }
      />
      {error && <FormAlert>That didn&apos;t work. Please try again.</FormAlert>}
      {groups.length === 0 && <p className="text-ui text-muted-foreground">No notifications yet.</p>}

      {groups.map((g) => (
        <section key={g.label} className="flex flex-col gap-2.5">
          <h2 className="text-caption font-bold tracking-[0.05em] text-muted-foreground uppercase">{g.label}</h2>
          {g.items.map((n) => {
            const { Icon, box } = look(n);
            const inner = (
              <>
                <span className={cn("flex size-10 flex-none items-center justify-center rounded-field", box)}>
                  <Icon size={20} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="flex flex-1 flex-col gap-0.75">
                  <strong className="text-ui">{n.title}</strong>
                  <span className="text-sm leading-[1.4] text-muted-foreground">{n.body}</span>
                  <span className="text-xs text-muted-foreground">{when(n.created_at, g.label === "Today")}</span>
                </span>
                {!n.read_at && (
                  <span className="mt-1.5 size-2.5 flex-none rounded-full bg-accent">
                    <span className="sr-only">Unread</span>
                  </span>
                )}
              </>
            );
            const cls = "flex gap-3 rounded-tile border border-border bg-card p-3.5 text-foreground no-underline hover:text-foreground";
            return n.link?.startsWith("/") ? (
              <Link key={n.id} href={n.link} className={cn(cls, "hover:border-primary")}>{inner}</Link>
            ) : (
              <div key={n.id} className={cls}>{inner}</div>
            );
          })}
        </section>
      ))}
    </main>
  );
}

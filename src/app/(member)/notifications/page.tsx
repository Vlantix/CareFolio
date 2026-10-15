import Link from "next/link";
import { Bell, FileCheck2, MessageCircleQuestion, MonitorSmartphone } from "lucide-react";
import { FormAlert } from "@/components/ui/form-alert";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { markAllRead } from "./actions";

export const metadata = { title: "Notifications · CareFolio" };

type Notice = { id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string };

const MANILA = "Asia/Manila";
function dayKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MANILA }).format(d);
}
function when(iso: string, today: boolean) {
  return new Intl.DateTimeFormat("en-PH", today
    ? { hour: "numeric", minute: "2-digit", timeZone: MANILA }
    : { month: "short", day: "numeric", timeZone: MANILA }).format(new Date(iso));
}

/** Icon + colours per kind of notice (design/MNotifications.html). */
function look(title: string) {
  if (title === "Document released") return { Icon: FileCheck2, box: "bg-primary text-primary-foreground" };
  if (title === "More information needed" || title === "Request declined")
    return { Icon: MessageCircleQuestion, box: "bg-attention text-attention-icon" };
  if (title === "New login") return { Icon: MonitorSmartphone, box: "bg-info text-info-foreground" };
  return { Icon: Bell, box: "bg-primary-soft text-primary" };
}

// design/MNotifications.html
export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  await requireMember();
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
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
        backHref="/home"
        backLabel="Back to home"
        action={
          unread ? (
            <form action={markAllRead}>
              <button type="submit" className="h-11 px-2.5 text-sm font-semibold text-primary hover:text-primary-hover">
                Mark all read
              </button>
            </form>
          ) : null
        }
      />
      {error === "1" && <FormAlert>That didn&apos;t work. Please try again.</FormAlert>}
      {groups.length === 0 && <p className="text-[15px] text-muted-foreground">No notifications yet.</p>}

      {groups.map((g) => (
        <section key={g.label} className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-bold tracking-[0.05em] text-muted-foreground uppercase">{g.label}</h2>
          {g.items.map((n) => {
            const { Icon, box } = look(n.title);
            const inner = (
              <>
                <span className={cn("flex size-10 flex-none items-center justify-center rounded-field", box)}>
                  <Icon size={20} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="flex flex-1 flex-col gap-[3px]">
                  <strong className="text-[15px]">{n.title}</strong>
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

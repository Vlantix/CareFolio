import { LogOut } from "lucide-react";
import { BottomNav } from "@/components/ui/bottom-nav";
import { Sidebar } from "@/components/ui/sidebar";
import { requireMember } from "@/lib/auth";
import { logout } from "@/app/actions/logout";
import { memberSidebar, memberTabs } from "@/lib/menus";
import { AccountStatusBanner } from "@/components/account-status";
import { createClient } from "@/lib/supabase/server";
import { IdleLogout } from "@/components/idle-logout";

// The logged-in app for patients and caregivers: dark sidebar on
// desktop, tab bar along the bottom on phones (design/DHome, Home).
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireMember();
  // No cron needed for the demo: reminders due within 24 hours become
  // in-app notifications (once each) whenever the app loads.
  await (await createClient()).rpc("notify_due_reminders");

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar
        items={memberSidebar}
        footer={
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-2 rounded-field px-3.5 py-3 text-[15px] text-sidebar-foreground hover:bg-sidebar-active hover:text-primary-foreground"
            >
              <LogOut size={18} aria-hidden /> Log out
            </button>
          </form>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AccountStatusBanner status={profile.status} reason={profile.reject_reason} />
        <div className="flex flex-1 flex-col">{children}</div>
        <BottomNav items={memberTabs} />
      </div>
      <IdleLogout />
    </div>
  );
}

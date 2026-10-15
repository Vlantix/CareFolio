import { LogOut } from "lucide-react";
import { BottomNav } from "@/components/ui/bottom-nav";
import { Sidebar } from "@/components/ui/sidebar";
import { requireMember } from "@/lib/auth";
import { logout } from "@/app/actions/logout";

// The logged-in app for patients and caregivers: dark sidebar on
// desktop, tab bar along the bottom on phones (design/DHome, Home).
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  await requireMember();

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar
        menu="member"
        footer={
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-2 rounded-field px-3.5 py-3 text-[15px] text-sidebar-foreground hover:bg-sidebar-active hover:text-white"
            >
              <LogOut size={18} aria-hidden /> Log out
            </button>
          </form>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col">{children}</div>
        <BottomNav menu="member" />
      </div>
    </div>
  );
}

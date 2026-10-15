import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/app/actions/logout";

export const metadata: Metadata = {
  title: "Records office · CareFolio",
  robots: { index: false, follow: false },
};

// Every page inside admin/(portal) is records-office only. Anyone else
// gets the ordinary 404 page (requireAdmin), so the area looks like it
// doesn't exist. The "(portal)" folder name doesn't appear in the URL.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar
        menu="admin"
        footer={
          <form action={logout}>
            <input type="hidden" name="to" value="staff" />
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-2 rounded-field px-3.5 py-3 text-[15px] text-sidebar-foreground hover:bg-sidebar-active hover:text-white"
            >
              <LogOut size={18} aria-hidden /> Log out
            </button>
          </form>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

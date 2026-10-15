import { FolderOpen, HeartPulse, House, Inbox, Link2, List, MonitorSmartphone, UserRound, type LucideIcon } from "lucide-react";

// Shared by the client-side BottomNav and Sidebar. Holds NO menu
// addresses: the menus themselves live in src/lib/menus.ts (server only),
// so staff addresses are never sent to a patient's browser.

export const navIcons = {
  home: House,
  list: List,
  inbox: Inbox,
  link: Link2,
  devices: MonitorSmartphone,
  records: FolderOpen,
  summary: HeartPulse,
  profile: UserRound,
} satisfies Record<string, LucideIcon>;

export interface NavItem {
  href: string;
  label: string;
  /** A key of navIcons (plain text, so a server page can pass it). */
  icon: keyof typeof navIcons;
}

/** True when `pathname` is this item's page or a page inside it. */
export function isActive(pathname: string, href: string, all: NavItem[]) {
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  // Don't light up "/admin" when a more specific item like "/admin/link" matches.
  return !all.some(
    (other) =>
      other.href.length > href.length &&
      (pathname === other.href || pathname.startsWith(other.href + "/")),
  );
}

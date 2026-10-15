import { House, Inbox, Link2, List, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// The menus for the MVP. Screens that are parked in docs/LATER.md
// (Records, Share, Family…) are deliberately left out.

/** Patient and caregiver menu: BottomNav on mobile, Sidebar on desktop. */
export const memberNav: NavItem[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/requests", label: "Requests", icon: List },
];

/** Records office menu (desktop Sidebar). */
export const adminNav: NavItem[] = [
  { href: "/admin", label: "Request queue", icon: Inbox },
  { href: "/admin/link", label: "Link accounts", icon: Link2 },
];

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

// BottomNav and Sidebar are client components, and icons can't be passed
// to them from a server page, so pages pick a menu by name instead.
export const menus = { member: memberNav, admin: adminNav };
export type MenuName = keyof typeof menus;

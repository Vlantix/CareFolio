import "server-only";
import type { NavItem } from "@/components/ui/nav-items";

// The app's menus. Server-only on purpose: a layout passes the right
// menu to Sidebar/BottomNav, so the staff menu (and its addresses) only
// ever reaches staff browsers. Add an item when its ticket ships —
// never link to a page that doesn't exist yet.

/**
 * Patients and caregivers — phone tab bar (design/Home.html). "Share"
 * joins when phase 6 builds /share; until then it's left out so nothing
 * links to a missing page.
 */
export const memberTabs: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/records", label: "Records", icon: "records" },
  { href: "/requests", label: "Requests", icon: "list" },
  { href: "/profile/sessions", label: "Profile", icon: "profile" },
];

/** Patients and caregivers — desktop sidebar (design/DHome.html). */
export const memberSidebar: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/records", label: "Records timeline", icon: "records" },
  { href: "/requests", label: "Requests", icon: "list" },
  { href: "/summary", label: "Health summary", icon: "summary" },
  { href: "/profile/sessions", label: "Devices", icon: "devices" },
];

/** Records office. "Link accounts" arrives with ticket 04. */
export const adminNav: NavItem[] = [
  { href: "/admin", label: "Request queue", icon: "inbox" },
  { href: "/admin/devices", label: "Devices", icon: "devices" },
];

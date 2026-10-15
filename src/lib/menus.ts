import "server-only";
import type { NavItem } from "@/components/ui/nav-items";

// The app's menus. Server-only on purpose: a layout passes the right
// menu to Sidebar/BottomNav, so the staff menu (and its addresses) only
// ever reaches staff browsers. Add an item when its ticket ships —
// never link to a page that doesn't exist yet.

/** Patients and caregivers. "Requests" arrives with ticket 05. */
export const memberNav: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/profile/sessions", label: "Devices", icon: "devices" },
];

/** Records office. "Link accounts" arrives with ticket 04. */
export const adminNav: NavItem[] = [{ href: "/admin", label: "Request queue", icon: "inbox" }];

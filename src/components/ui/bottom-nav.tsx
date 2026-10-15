"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, menus, type MenuName } from "@/components/ui/nav-items";

/** Mobile tab bar along the bottom of the screen. Hidden from md up. */
export function BottomNav({ menu }: { menu: MenuName }) {
  const pathname = usePathname();
  const items = menus[menu];
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 grid border-t border-border bg-card px-2 pt-2 pb-5 md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href, items);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-col items-center gap-1 py-1.5 text-[11px] no-underline",
              active
                ? "font-bold text-primary hover:text-primary"
                : "font-semibold text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={22} strokeWidth={active ? 2 : 1.8} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

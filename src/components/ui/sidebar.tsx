"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { isActive, menus, type MenuName } from "@/components/ui/nav-items";

/** Dark desktop menu down the left side. Hidden below md. */
export function Sidebar({
  menu,
  footer,
}: {
  menu: MenuName;
  /** Optional slot at the bottom, e.g. a log out button. */
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = menus[menu];
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-7 bg-sidebar px-[18px] py-7 text-white md:flex">
      <Link href={items[0]?.href ?? "/"} className="px-2 no-underline">
        <Logo variant="dark" />
      </Link>
      <nav aria-label="Main" className="flex flex-col gap-1 text-[15px]">
        {items.map(({ href, label }) => {
          const active = isActive(pathname, href, items);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-field px-3.5 py-3 no-underline",
                active
                  ? "bg-sidebar-active font-bold text-white hover:text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-active hover:text-white",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      {footer && <div className="mt-auto">{footer}</div>}
    </aside>
  );
}

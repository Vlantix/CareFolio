import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Screen title with a 44px back button, as on "Request a document".
 * `action` is an optional slot on the right (for example a filter button).
 */
export function PageHeader({
  title,
  backHref,
  backLabel = "Back",
  action,
  className,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {backHref && <BackButton href={backHref} label={backLabel} />}
      <h1 className="flex-1 font-heading text-[22px] font-bold leading-tight">
        {title}
      </h1>
      {action}
    </div>
  );
}

/** The 44px square back button on its own, for headers with no title. */
export function BackButton({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-field border border-border bg-card text-foreground hover:bg-primary-soft hover:text-foreground"
    >
      <ChevronLeft size={20} strokeWidth={2} aria-hidden />
    </Link>
  );
}

import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The CareFolio logo: the official mark image plus the word "carefolio" as
 * live text. Never redraw the mark — it comes from public/brand.
 *
 * - variant "light": for light pages (ink text)
 * - variant "dark":  for navy or ink backgrounds (white text)
 */
export function Logo({
  variant = "light",
  size = "md",
  className,
}: {
  variant?: "light" | "dark";
  size?: "md" | "lg";
  className?: string;
}) {
  const mark = size === "lg" ? 40 : 34;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={mark}
        height={mark}
        priority
        className={size === "lg" ? "rounded-[10px]" : "rounded-[9px]"}
      />
      <span
        className={cn(
          "font-heading font-extrabold tracking-[-0.02em]",
          size === "lg" ? "text-[22px]" : "text-xl",
          variant === "dark" ? "text-primary-foreground" : "text-foreground",
        )}
      >
        carefolio
      </span>
    </span>
  );
}

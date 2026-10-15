import { cn } from "@/lib/utils";

/** A message box above a form. role="alert" makes screen readers read it out. */
export function FormAlert({
  children,
  tone = "error",
  className,
}: {
  children: React.ReactNode;
  tone?: "error" | "info";
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-field px-3.5 py-3 text-sm font-semibold",
        tone === "error"
          ? "bg-danger text-danger-foreground"
          : "bg-primary-soft text-primary-deep",
        className,
      )}
    >
      {children}
    </p>
  );
}

"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/** Password field with a show/hide eye button inside it (design/Main.html). */
export function PasswordInput({
  id,
  label,
  labelAction,
  error,
  hint,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id: string;
  label: React.ReactNode;
  /** Something on the right of the label row, e.g. "Forgot password?". */
  labelAction?: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  const messageId = error || hint ? `${id}-message` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      <div
        className={cn(
          "flex h-[52px] items-center rounded-field border-[1.5px] border-input bg-card pl-4",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30",
          error && "border-danger-foreground",
        )}
      >
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="flex size-12 shrink-0 items-center justify-center rounded-field text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {visible ? (
            <EyeOff size={22} strokeWidth={1.8} aria-hidden />
          ) : (
            <Eye size={22} strokeWidth={1.8} aria-hidden />
          )}
        </button>
      </div>
      {messageId && (
        <p
          id={messageId}
          className={cn(
            "text-[13px]",
            error ? "font-semibold text-danger-foreground" : "text-muted-foreground",
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

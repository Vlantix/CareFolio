import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function Input({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        // 16px text stops iPhones zooming in when the field is tapped.
        "flex h-12 w-full min-w-0 rounded-field border-[1.5px] border-input bg-card px-3.5 text-base text-foreground",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30",
        "aria-invalid:border-danger-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: React.ReactNode;
  /** Small grey help text under the field. */
  hint?: React.ReactNode;
  /** Shown in place of the hint, and marks the field invalid. */
  error?: string;
}

/**
 * An Input with its Label (and optional hint or error) wired up, so screen
 * readers announce the label and the message together with the field.
 */
export function InputField({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: InputFieldProps) {
  const messageId = error || hint ? `${id}-message` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        {...props}
      />
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

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Sizes come from the designs. Every size is at least 44px tall so it is
// easy to tap. `lg` is the big full-width call to action at the bottom of
// mobile screens ("Log in", "Submit request").
//
// For a link that looks like a button, use buttonVariants on next/link:
//   <Link href="/requests/new" className={buttonVariants()}>New request</Link>
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground",
        secondary:
          "bg-primary-soft text-primary-deep hover:brightness-95 hover:text-primary-deep",
        outline:
          "border border-border bg-card text-foreground hover:bg-primary-soft hover:text-foreground",
        ghost: "text-primary hover:bg-primary-soft hover:text-primary-hover",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90 hover:text-destructive-foreground",
      },
      size: {
        default: "h-12 rounded-field px-5 text-[15px]",
        sm: "h-11 rounded-field px-[18px] text-[15px]",
        lg: "h-[54px] w-full rounded-button px-6 text-[17px]",
        icon: "size-11 rounded-field",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };

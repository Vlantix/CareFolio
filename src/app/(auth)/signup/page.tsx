import Link from "next/link";
import { BackButton } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { BrandPanel } from "../brand-panel";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create your account · CareFolio" };

const STEPS = [
  "Create your account",
  "Verify with an email code",
  "Accept the terms",
  "Records office links your account",
];

// design/MSignup.html (mobile) and design/DSignup.html (desktop).
export default function SignupPage() {
  return (
    <div className="cf-enter flex min-h-full flex-1 flex-wrap">
      <BrandPanel>
        <p className="font-heading text-[42px] leading-[1.08] font-bold tracking-[-0.03em]">
          Set up a folder for the person you care for.
        </p>
        <ol className="flex flex-col gap-3.5 text-base">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full font-extrabold",
                  i === 0 ? "bg-white text-primary" : "border-2 border-on-primary-muted",
                )}
              >
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </BrandPanel>

      <main className="flex flex-[1.4_1_480px] justify-center px-6 pt-5 pb-6 lg:px-8 lg:py-12">
        <div className="flex w-full max-w-[560px] flex-col gap-4 lg:gap-5">
          {/* Phone only: back button + step label (design/MSignup.html). */}
          <div className="flex items-center justify-between lg:hidden">
            <BackButton href="/login" label="Back to log in" />
            <span className="text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
              Step 1 of 2 · Account
            </span>
            <span className="w-11" />
          </div>

          <div className="flex flex-col gap-1 lg:gap-1.5">
            <h1 className="font-heading text-[28px] font-bold tracking-[-0.02em] lg:text-[32px]">
              Create your account
            </h1>
            <p className="text-[15px] text-muted-foreground lg:text-base">
              <span className="lg:hidden">For patients and family caregivers.</span>
              <span className="hidden lg:inline">
                Already registered?{" "}
                <Link href="/login" className="font-semibold">Log in</Link>
              </span>
            </p>
          </div>

          <SignupForm />

          <p className="text-center text-sm text-muted-foreground lg:hidden">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

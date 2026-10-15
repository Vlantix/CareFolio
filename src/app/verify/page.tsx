import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { BackButton } from "@/components/ui/page-header";
import { currentLogin } from "@/lib/login";
import { maskEmail } from "@/lib/device";
import { PORTAL_COOKIE } from "@/lib/mfa";
import { OtpForm } from "./otp-form";

export const metadata = { title: "Check your email · CareFolio" };
// The code email is sent from this page's server actions (Gmail API,
// Node's Buffer and crypto), so this runs on Node.js, not the Edge runtime.
export const runtime = "nodejs";


// design/Otp.html (mobile) and design/DVerify.html (desktop).
export default async function VerifyPage() {
  const login = await currentLogin();
  if (!login) redirect("/login");
  // No recent password login (for example a device that was logged out
  // from the Devices page): don't email a code — log in again.
  if (!login.passwordRecently) redirect("/login?notice=expired");
  const { supabase, email } = login;
  // Each login has its own session id; the code timer is tied to it.
  const loginId = login.sessionId ?? login.userId;

  // Too many wrong codes? Show when they can try again.
  const { data: lockedUntil } = await supabase.rpc("otp_locked_until");

  // Staff go back to the staff page; nobody else ever sees that link.
  const staff = (await cookies()).get(PORTAL_COOKIE)?.value === "staff";
  const backHref = staff ? "/admin/login" : "/login";

  return (
    <div className="cf-enter flex min-h-full flex-1 flex-col">
      {/* Desktop top bar */}
      <header className="hidden flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-10 py-5 lg:flex">
        <Logo />
        <StepLabel />
      </header>

      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-6 px-6 pt-6 pb-8 lg:gap-7 lg:py-14">
        <div className="flex flex-col gap-6 lg:hidden">
          <BackButton href={backHref} label="Back to log in" />
          <StepLabel />
        </div>
        <Link href={backHref} className="hidden text-sm font-semibold lg:block">
          ← Back to log in
        </Link>

        <span className="flex size-16 items-center justify-center rounded-[20px] bg-attention text-attention-icon">
          <Mail size={30} strokeWidth={1.8} aria-hidden />
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-[30px] leading-[1.15] font-bold tracking-[-0.02em] lg:text-4xl">
            Check your email
          </h1>
          <p className="text-base leading-normal text-muted-foreground lg:text-[17px]">
            Enter the 6-digit code we sent to{" "}
            <strong className="text-foreground">{maskEmail(email)}</strong>.
          </p>
        </div>

        <section className="lg:rounded-panel lg:border-[1.5px] lg:border-border lg:bg-card lg:p-7">
          <OtpForm loginId={loginId} lockedUntil={lockedUntil ?? undefined} />
        </section>

        <Link href={backHref} className="py-2 text-center text-[15px] font-semibold lg:hidden">
          Wrong email? Log in again
        </Link>
        <p className="hidden text-sm leading-normal text-muted-foreground lg:block">
          Protected under the Data Privacy Act of 2012 (RA 10173).{" "}
          <Link href={backHref} className="font-semibold">
            Wrong email? Log in again
          </Link>
        </p>
      </main>
    </div>
  );
}

function StepLabel() {
  return (
    <span className="text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
      Step 2 of 2 · Email verification
    </span>
  );
}

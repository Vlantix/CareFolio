import { Logo } from "@/components/ui/logo";
import { BackButton } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { NewPasswordForm, RequestResetForm } from "./forms";

export const metadata = { title: "Reset password · CareFolio" };

// No design file for this screen; it follows design/Main.html.
export default async function ResetPasswordPage() {
  // A session created by the OTP code (AMR "otp") or the old magic-link
  // path (AMR "recovery") unlocks the new-password step. A regular
  // password login must not be able to set a new password here.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const amr = (data?.claims?.amr ?? []) as Array<{ method: string } | string>;
  const canSetPassword = amr.some(
    (e) =>
      typeof e === "object" &&
      e !== null &&
      "method" in e &&
      ["recovery", "otp"].includes((e as { method: string }).method),
  );

  const heading = canSetPassword ? "Choose a new password" : "Forgot your password?";
  const sub = canSetPassword
    ? "After saving, log in again with your new password."
    : "Enter your email and we'll send you a 6-digit code to reset it.";

  return (
    <main className="cf-enter mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-7 px-6 pt-6 pb-8 lg:pt-14">
      <BackButton href="/login" label="Back to log in" />
      <Logo size="lg" />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[32px] leading-[1.1] font-bold tracking-[-0.02em]">
          {heading}
        </h1>
        <p className="text-base leading-normal text-muted-foreground">{sub}</p>
      </div>
      {canSetPassword ? <NewPasswordForm /> : <RequestResetForm />}
    </main>
  );
}

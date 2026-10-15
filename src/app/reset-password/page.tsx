import { Logo } from "@/components/ui/logo";
import { BackButton } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { NewPasswordForm, RequestResetForm } from "./forms";

export const metadata = { title: "Reset password · CareFolio" };

// No design file for this screen; it follows design/Main.html.
export default async function ResetPasswordPage() {
  // Arriving from the emailed link gives a "recovery" login. Only then
  // may a new password be set — a normal login can't use this page.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const amr = (data?.claims?.amr ?? []) as Array<{ method: string } | string>;
  const recovering = amr.some((e) => typeof e === "object" && e.method === "recovery");

  return (
    <main className="cf-enter mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-7 px-6 pt-6 pb-8 lg:pt-14">
      <BackButton href="/login" label="Back to log in" />
      <Logo size="lg" />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[32px] leading-[1.1] font-bold tracking-[-0.02em]">
          {recovering ? "Choose a new password" : "Forgot your password?"}
        </h1>
        <p className="text-base leading-normal text-muted-foreground">
          {recovering
            ? "After saving, log in again with the new password."
            : "Enter your email and we'll send you a link to reset it."}
        </p>
      </div>
      {recovering ? <NewPasswordForm /> : <RequestResetForm />}
    </main>
  );
}

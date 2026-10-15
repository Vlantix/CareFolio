import Image from "next/image";
import type { Metadata } from "next";
import { FormAlert } from "@/components/ui/form-alert";
import { StaffLoginForm } from "./staff-login-form";

// Reached ONLY by typing /admin/login. Never link to it from anything a
// patient or caregiver can see. Hiding the URL is not the protection —
// the admin role check and RLS are — it just keeps it out of sight.
export const metadata: Metadata = {
  title: "Staff log in · CareFolio",
  robots: { index: false, follow: false },
};

// design/DAdminLogin.html
export default async function StaffLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { failed, idle } = await searchParams;

  return (
    <main className="cf-enter flex min-h-full flex-1 flex-col items-center justify-center bg-navy px-4 py-12 sm:px-6">
      <div className="flex w-full max-w-[440px] flex-col gap-[22px] rounded-hero bg-card p-6 sm:p-9">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={40}
            height={40}
            priority
            className="rounded-chip"
          />
          <span className="flex flex-col">
            <span className="font-heading text-xl font-extrabold">carefolio</span>
            <span className="text-xs font-bold tracking-[0.06em] text-primary uppercase">
              Records office
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-[28px] font-bold tracking-[-0.02em]">Staff log in</h1>
          <p className="text-[15px] leading-normal text-muted-foreground">
            Authorized records staff only. Every sign-in is recorded.
          </p>
        </div>

        {idle === "1" && failed !== "1" && (
          <FormAlert tone="info">You were logged out after 15 minutes without activity.</FormAlert>
        )}
        <StaffLoginForm failed={failed === "1"} />

        <p className="text-center text-sm text-muted-foreground">
          Next, we&apos;ll email you a 6-digit code. Forgot your password? Ask your
          super admin to reset it.
        </p>
      </div>
    </main>
  );
}

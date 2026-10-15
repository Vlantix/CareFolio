import Image from "next/image";
import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth";
import { FACILITY_NAME } from "@/lib/facility";
import { LoadingChecklist } from "./checklist";

export const metadata = { title: "Setting up · CareFolio" };

const LABELS = [
  { mobile: "Identity verified", desktop: "Identity verified" },
  { mobile: "Secure session started", desktop: "Secure session started" },
  { mobile: `Loading records from ${FACILITY_NAME}`, desktop: "Loading records" },
  { mobile: "Preparing your health summary", desktop: "Preparing summary" },
];

// design/Loading.html (mobile) and design/DLoading.html (desktop).
// Shown right after the email code is accepted.
export default async function LoadingPage() {
  const { userId, mfa } = await getAuthState();
  if (!userId) redirect("/login");
  if (!mfa) redirect("/verify");

  return (
    <main className="cf-enter flex flex-1 flex-col items-center px-7 pt-10 pb-8 lg:justify-center lg:px-6 lg:py-12">
      <div className="flex w-full max-w-[520px] flex-1 flex-col items-center gap-7 lg:flex-none">
        <div className="grow lg:hidden" />
        <div className="relative flex size-[132px] items-center justify-center lg:size-[140px]">
          <span className="cf-pulse absolute inset-0 rounded-[40px] bg-pulse lg:rounded-[42px]" />
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={100}
            height={100}
            priority
            className="relative size-24 rounded-[25px] lg:size-[100px] lg:rounded-[26px]"
          />
        </div>
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-heading text-[26px] font-bold tracking-[-0.02em] lg:text-[34px]">
            Setting up your folder
          </h1>
          <p className="text-[15px] leading-normal text-muted-foreground lg:text-[17px]">
            Hang tight — this only takes a moment.
          </p>
        </div>
        <LoadingChecklist labels={LABELS} />
        <div className="grow lg:hidden" />
      </div>
    </main>
  );
}

import Link from "next/link";
import { FileText, ShieldCheck, Download } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { BrandPanel } from "../brand-panel";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in · CareFolio" };

const NOTICES: Record<string, string> = {
  reset: "Your password was changed. Log in with the new one.",
  expired: "Please log in again to get a new code.",
  idle: "You were logged out after 15 minutes without activity.",
};

const POINTS = [
  { icon: FileText, title: "Request official documents", body: "From home, without the queue." },
  { icon: ShieldCheck, title: "Released by the records office", body: "The official copy, straight from the hospital." },
  { icon: Download, title: "View and download anytime", body: "Show it to a doctor, employer or insurer." },
];

// design/Main.html (mobile) and design/DLogin.html (desktop).
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { notice } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 flex-wrap">
      <BrandPanel>
        <p className="max-w-[520px] font-heading text-5xl leading-[1.05] font-bold tracking-[-0.03em]">
          Every record. One folder. Any doctor.
        </p>
        <ul className="flex max-w-[480px] flex-col gap-[18px] text-base">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-primary-hover">
                <Icon size={18} strokeWidth={2} aria-hidden />
              </span>
              <span>
                <strong>{title}</strong>
                <br />
                <span className="text-on-primary-muted">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </BrandPanel>

      <main className="flex flex-[1_1_440px] justify-center px-6 pt-14 pb-8 lg:items-center lg:px-8 lg:py-14">
        <div className="flex w-full max-w-[420px] flex-col gap-7 lg:gap-6">
          {/* Phone: logo + "Welcome back". Desktop: the panel has the logo. */}
          <Logo size="lg" className="lg:hidden" />
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[32px] leading-[1.1] font-bold tracking-[-0.02em]">
              <span className="lg:hidden">Welcome back</span>
              <span className="hidden lg:inline">Log in</span>
            </h1>
            <p className="text-base leading-normal text-muted-foreground">
              <span className="lg:hidden">Your family&apos;s official health records, in one folder.</span>
              <span className="hidden lg:inline">For patients and family caregivers.</span>
            </p>
          </div>

          <LoginForm notice={typeof notice === "string" ? NOTICES[notice] : undefined} />

          <p className="text-center text-[15px] text-muted-foreground lg:mt-0 max-lg:mt-auto">
            New to CareFolio?{" "}
            <Link href="/signup" className="font-semibold">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

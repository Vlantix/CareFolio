import { LogOut } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { logout } from "@/app/actions/logout";

export const metadata = { title: "Home · CareFolio" };

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

// design/Home.html (mobile) and design/DHome.html (desktop).
// Linked patients and requests arrive in tickets 04 and 05.
export default async function HomePage() {
  const profile = await requireMember();
  const firstName = profile.full_name.split(/\s+/)[0];
  const today = new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date());

  return (
    <main className="cf-enter flex flex-col gap-4 px-5 pt-5 pb-4 md:gap-6 md:px-10 md:py-8">
      {/* Phone header */}
      <div className="flex items-center gap-3 md:hidden">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground font-bold text-white"
        >
          {initials(profile.full_name)}
        </span>
        <h1 className="flex flex-1 flex-col">
          <span className="text-[13px] font-normal text-muted-foreground">{greeting()},</span>
          <span className="font-heading text-xl font-bold">{firstName}</span>
        </h1>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Log out"
            className="flex size-11 items-center justify-center rounded-field border border-border bg-card text-foreground hover:bg-primary-soft"
          >
            <LogOut size={20} strokeWidth={1.8} aria-hidden />
          </button>
        </form>
      </div>

      {/* Desktop header */}
      <div className="hidden flex-col gap-1 md:flex">
        <span className="text-sm text-muted-foreground">{today}</span>
        <h1 className="font-heading text-[30px] font-bold tracking-[-0.02em]">
          {greeting()}, {firstName}
        </h1>
      </div>

      <div className="rounded-field bg-primary-soft px-3.5 py-3 text-sm text-primary-deep">
        <strong>Waiting for the records office.</strong> They will link your
        account to {profile.role === "caregiver" ? "the patient you care for" : "your hospital record"}.
        After that you can request lab results here.
      </div>
    </main>
  );
}

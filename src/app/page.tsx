import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

// Temporary landing page for ticket 01: proves the brand is live.
// Ticket 02 replaces it with the real Log in screen (design/Main.html).
export default function Landing() {
  return (
    <main className="cf-enter mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-7 px-6 pt-14 pb-8">
      <Logo size="lg" />

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[32px] leading-[1.1] font-bold tracking-[-0.02em]">
          Your official lab results, without the queue
        </h1>
        <p className="text-base leading-normal text-muted-foreground">
          Request a copy from the hospital records office online, then view
          and download it on your phone. No trip, no queue.
        </p>
      </div>

      <div className="flex flex-col gap-3.5">
        <Button size="lg" disabled>
          Log in
        </Button>
        <p className="text-center text-sm leading-[1.45] text-muted-foreground">
          Accounts open soon.
        </p>
      </div>
    </main>
  );
}

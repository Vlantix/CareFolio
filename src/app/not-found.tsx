import Link from "next/link";
import { Logo } from "@/components/ui/logo";

// Shown for any address that doesn't exist — and, on purpose, for the
// staff area when the visitor isn't staff. Keep it generic.
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-6 px-6 pt-14 pb-8">
      <Logo size="lg" />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-[32px] leading-[1.1] font-bold tracking-[-0.02em]">
          Page not found
        </h1>
        <p className="text-base leading-normal text-muted-foreground">
          This page doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link href="/" className="font-semibold">
        Go to CareFolio
      </Link>
    </main>
  );
}

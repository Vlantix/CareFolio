import Image from "next/image";
import type { Metadata } from "next";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = {
  title: "Verify a document · CareFolio",
  description: "Check that a CareFolio document is genuine using its verification code.",
};

// Public: for doctors, schools, employers and insurers. No login.
// design/MVerifyDoc.html
export default function VerifyDocumentPage() {
  return (
    <main className="cf-enter mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-5 px-5 pt-6 pb-8 md:pt-14">
      <div className="flex items-center gap-2.5">
        <Image src="/brand/logo-mark.png" alt="" width={34} height={34} className="rounded-[9px]" />
        <span className="font-heading text-xl font-extrabold">
          carefolio <span className="font-semibold text-primary">verify</span>
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-display leading-[1.15] font-bold tracking-[-0.02em]">Is this document real?</h1>
        <p className="text-ui leading-normal text-muted-foreground">
          For doctors, schools, employers and insurers. Enter the code printed on the document.
        </p>
      </div>
      <VerifyForm />
      <p className="text-caption leading-normal text-muted-foreground">
        Patient names are partly hidden here for privacy. Some offices may still require an original
        stamped copy.
      </p>
    </main>
  );
}

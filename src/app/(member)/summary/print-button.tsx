"use client";

import { Printer } from "lucide-react";
import { useProtectedPrint } from "@/components/protected-view";

/** The ONLY way to print the summary — prints the watermarked version. */
export function PrintButton() {
  const { printWatermarked } = useProtectedPrint();
  return (
    <button
      type="button"
      onClick={printWatermarked}
      className="flex h-13 items-center justify-center gap-2 rounded-button border-[1.5px] border-input bg-card font-semibold text-foreground hover:bg-primary-soft"
    >
      <Printer size={18} aria-hidden /> Print PDF
    </button>
  );
}

import { ShieldAlert, ShieldQuestion } from "lucide-react";
import type { Profile } from "@/lib/auth";

/**
 * Shown on every member page until the records office has checked the
 * account. While pending, creating requests is switched off (and the
 * database refuses it too: can_request_for()).
 */
export function AccountStatusBanner({
  status,
  reason,
}: {
  status: Profile["status"];
  reason: string | null;
}) {
  if (status === "active") return null;
  const rejected = status === "rejected";
  const Icon = rejected ? ShieldAlert : ShieldQuestion;
  return (
    <div
      role="status"
      className={
        rejected
          ? "flex items-start gap-3 print:hidden bg-danger px-5 py-3 text-sm text-danger-foreground md:px-10"
          : "flex items-start gap-3 print:hidden bg-attention px-5 py-3 text-sm text-attention-foreground md:px-10"
      }
    >
      <Icon size={20} strokeWidth={1.8} aria-hidden className="mt-px shrink-0" />
      <p>
        {rejected ? (
          <>
            <strong>Your account was not approved.</strong>{" "}
            {reason ?? "Please contact the records office."}
          </>
        ) : (
          <>
            <strong>The records office is checking your ID.</strong> You can look
            around, but requests open once your account is approved.
          </>
        )}
      </p>
    </div>
  );
}

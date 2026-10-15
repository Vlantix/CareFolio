import { cn } from "@/lib/utils";

/** The four request statuses from docs/SPEC.md. */
export type RequestStatus = "submitted" | "approved" | "declined" | "released";

// Colours and wording copied from the chips in the design files.
const styles: Record<RequestStatus, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-info text-info-foreground" },
  approved: { label: "Approved", className: "bg-info text-info-foreground" },
  declined: { label: "Declined", className: "bg-danger text-danger-foreground" },
  released: { label: "Released", className: "bg-primary-soft text-primary-deep" },
};

export function StatusChip({
  status,
  className,
}: {
  status: RequestStatus;
  className?: string;
}) {
  const { label, className: colours } = styles[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-[5px] text-xs font-bold",
        colours,
        className,
      )}
    >
      {label}
    </span>
  );
}

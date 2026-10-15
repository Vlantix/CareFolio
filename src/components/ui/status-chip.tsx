import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/lib/records";

export type { RequestStatus };

// Colours and wording copied from the chips in the design files.
const styles: Record<RequestStatus, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-info text-info-foreground" },
  under_review: { label: "Under review", className: "bg-attention text-attention-foreground" },
  // Darker orange than the design's #C2611A so white text passes WCAG AA.
  info_requested: { label: "Info needed", className: "bg-attention-icon text-primary-foreground" },
  approved: { label: "Approved", className: "bg-info text-info-foreground" },
  released: { label: "Released", className: "bg-primary-soft text-primary-deep" },
  declined: { label: "Declined", className: "bg-danger text-danger-foreground" },
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
        "inline-flex shrink-0 items-center self-start rounded-full px-2.5 py-[5px] text-xs font-bold",
        colours,
        className,
      )}
    >
      {label}
    </span>
  );
}

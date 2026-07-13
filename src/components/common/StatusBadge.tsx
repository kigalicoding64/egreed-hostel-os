import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Tone = "neutral" | "success" | "warning" | "info" | "destructive" | "primary";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  success: "bg-success/15 text-success border-transparent",
  warning: "bg-warning/20 text-warning border-transparent",
  info: "bg-info/15 text-info border-transparent",
  destructive: "bg-destructive/15 text-destructive border-transparent",
  primary: "bg-primary/12 text-primary border-transparent",
};

/** Maps domain statuses to a visual tone + readable label. */
const STATUS_MAP: Record<string, { tone: Tone; label: string }> = {
  // rooms
  available: { tone: "success", label: "Available" },
  occupied: { tone: "info", label: "Occupied" },
  reserved: { tone: "primary", label: "Reserved" },
  dirty: { tone: "warning", label: "Dirty" },
  cleaning: { tone: "warning", label: "Cleaning" },
  inspected: { tone: "info", label: "Inspected" },
  maintenance: { tone: "warning", label: "Maintenance" },
  out_of_order: { tone: "destructive", label: "Out of Order" },
  out_of_service: { tone: "destructive", label: "Out of Service" },
  blocked: { tone: "destructive", label: "Blocked" },
  // reservations
  pending: { tone: "warning", label: "Pending" },
  confirmed: { tone: "info", label: "Confirmed" },
  checked_in: { tone: "success", label: "Checked In" },
  checked_out: { tone: "neutral", label: "Checked Out" },
  cancelled: { tone: "destructive", label: "Cancelled" },
  no_show: { tone: "destructive", label: "No Show" },
  draft: { tone: "neutral", label: "Draft" },
  waitlist: { tone: "primary", label: "Waitlist" },
  // payments
  paid: { tone: "success", label: "Paid" },
  partial: { tone: "warning", label: "Partial" },
  refunded: { tone: "info", label: "Refunded" },
  failed: { tone: "destructive", label: "Failed" },
};

export function StatusBadge({
  status,
  children,
  className,
}: {
  status: string;
  children?: ReactNode;
  className?: string;
}) {
  const cfg = STATUS_MAP[status] ?? { tone: "neutral" as Tone, label: status };
  return (
    <Badge className={cn("font-medium", TONES[cfg.tone], className)}>
      {children ?? cfg.label}
    </Badge>
  );
}

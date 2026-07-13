import { cn } from "@/lib/utils";
import { ROLE_LABELS, type AppRole } from "@/lib/rbac";

export function RoleBadge({
  role,
  className,
}: {
  role: AppRole;
  className?: string;
}) {
  const tone =
    role === "super_admin" || role === "hotel_owner" || role === "general_manager"
      ? "bg-primary/12 text-primary"
      : "bg-secondary text-secondary-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

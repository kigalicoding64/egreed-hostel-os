import type { ReactNode } from "react";
import { Ban } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * Generic role gate for full pages. The sidebar already hides what a role
 * cannot use — this blocks direct URL access to the same module.
 */
export function AccessGuard({
  allowed,
  feature,
  children,
}: {
  allowed: boolean;
  feature: string;
  children: ReactNode;
}) {
  if (allowed) return <>{children}</>;
  return (
    <EmptyState
      icon={Ban}
      title={`No access to ${feature}`}
      description="Your role does not include this module. Ask a manager to adjust your permissions if you need access."
    />
  );
}

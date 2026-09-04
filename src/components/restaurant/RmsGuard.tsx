import type { ReactNode } from "react";
import { Ban } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * Role gate for restaurant surfaces. The sidebar and tab bar already hide what a
 * role cannot use — this blocks direct URL access to the same features.
 */
export function RmsGuard({
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
      description="Your role does not include this restaurant feature. Ask a manager to adjust your permissions if you need it."
    />
  );
}

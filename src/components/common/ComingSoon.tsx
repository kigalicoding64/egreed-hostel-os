import { Construction } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import type { LucideIcon } from "lucide-react";

/**
 * Standard placeholder for modules that are scaffolded in the architecture
 * but not yet fully built (POS, Housekeeping tasks, Maintenance, etc.).
 */
export function ComingSoon({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} icon={<Construction className="h-5 w-5" />} />
      <EmptyState
        icon={icon}
        title={`${title} is coming soon`}
        description="This module is part of the EGREED roadmap. The data foundation and access rules are already in place — the interface is being built next."
      />
    </div>
  );
}

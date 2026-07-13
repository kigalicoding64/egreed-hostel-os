import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export const Route = createFileRoute("/_authenticated/maintenance")({
  component: () => (
    <ComingSoon
      title="Maintenance"
      description="Work orders, preventive maintenance and asset tracking."
      icon={Wrench}
    />
  ),
});

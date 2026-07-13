import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export const Route = createFileRoute("/_authenticated/housekeeping")({
  component: () => (
    <ComingSoon
      title="Housekeeping"
      description="Room cleaning schedules, task assignment and inspections."
      icon={Sparkles}
    />
  ),
});

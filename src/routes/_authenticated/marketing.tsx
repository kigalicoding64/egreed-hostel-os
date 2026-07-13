import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export const Route = createFileRoute("/_authenticated/marketing")({
  component: () => (
    <ComingSoon
      title="Marketing"
      description="Campaigns, guest CRM segments and loyalty programs."
      icon={Megaphone}
    />
  ),
});

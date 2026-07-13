import { createFileRoute } from "@tanstack/react-router";
import { Headphones } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export const Route = createFileRoute("/_authenticated/support")({
  component: () => (
    <ComingSoon
      title="Customer Support"
      description="Guest requests, tickets and service recovery."
      icon={Headphones}
    />
  ),
});

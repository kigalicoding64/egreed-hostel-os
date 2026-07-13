import { createFileRoute } from "@tanstack/react-router";
import { UtensilsCrossed } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export const Route = createFileRoute("/_authenticated/restaurant")({
  component: () => (
    <ComingSoon
      title="Restaurant POS"
      description="Point of sale, orders, menu and kitchen tickets."
      icon={UtensilsCrossed}
    />
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { ComingSoon } from "@/components/common/ComingSoon";

export const Route = createFileRoute("/_authenticated/security")({
  component: () => (
    <ComingSoon
      title="Security"
      description="Incident reports, patrols and access control logs."
      icon={ShieldCheck}
    />
  ),
});

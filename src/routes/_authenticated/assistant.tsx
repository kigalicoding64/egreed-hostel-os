import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { AccessGuard } from "@/components/common/AccessGuard";
import { HotelChat } from "@/components/ai/HotelChat";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant | EGREED Hospitality" },
      { name: "description", content: "Ask about live occupancy, guests and operations, get reports and action suggestions." },
      { property: "og:title", content: "AI Assistant | EGREED Hospitality" },
      { property: "og:description", content: "An operations assistant that reads your live hotel data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const { roles, hasAnyRole } = useAuth();
  const allowed =
    roles.includes("super_admin") ||
    hasAnyRole([
      "hotel_owner",
      "general_manager",
      "receptionist",
      "housekeeping_manager",
      "maintenance_manager",
      "marketing_manager",
      "restaurant_manager",
      "customer_support",
    ]);

  return (
    <AccessGuard allowed={allowed} feature="the AI assistant">
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
        <PageHeader
          title="AI Assistant"
          description="Answers from your live rooms, guests, bookings and operations data."
          icon={<Bot className="h-5 w-5" />}
        />
        <HotelChat
          className="flex-1"
          api="/api/chat/staff"
          storageKey="egreed.ai.staff"
          title="Operations assistant"
          subtitle="Ask a question, request a report or get action suggestions."
          placeholder="e.g. Write today's operations report"
          suggestions={[
            "Write today's operations report",
            "Which rooms need cleaning first?",
            "Suggest maintenance priorities this week",
            "Suggest a marketing action for next month",
          ]}
        />
      </div>
    </AccessGuard>
  );
}

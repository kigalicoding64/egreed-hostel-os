import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarRange, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { AccessGuard } from "@/components/common/AccessGuard";
import { Button } from "@/components/ui/button";
import { RoomCalendar } from "@/components/reservations/RoomCalendar";
import { ReservationWizard } from "@/components/reservations/ReservationWizard";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Room Calendar | EGREED Hospitality" },
      {
        name: "description",
        content:
          "Drag-and-drop room calendar showing bookings, arrivals, departures and live room status.",
      },
      { property: "og:title", content: "Room Calendar | EGREED Hospitality" },
      {
        property: "og:description",
        content: "Plan stays, move bookings between rooms and track arrivals at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { roles, hasAnyRole } = useAuth();
  const [wizard, setWizard] = useState(false);

  const canView =
    roles.includes("super_admin") ||
    hasAnyRole([
      "hotel_owner",
      "general_manager",
      "receptionist",
      "customer_support",
      "housekeeping_manager",
    ]);
  const canEdit =
    roles.includes("super_admin") ||
    hasAnyRole(["hotel_owner", "general_manager", "receptionist"]);

  return (
    <AccessGuard allowed={canView} feature="the room calendar">
      <div className="space-y-6">
        <PageHeader
          title="Room Calendar"
          description="Drag bookings between rooms and dates. Conflicts are blocked automatically."
          icon={<CalendarRange className="h-5 w-5" />}
          actions={
            canEdit ? (
              <Button size="sm" onClick={() => setWizard(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> New reservation
              </Button>
            ) : null
          }
        />
        <RoomCalendar days={14} canEdit={canEdit} />
        <ReservationWizard open={wizard} onOpenChange={setWizard} />
      </div>
    </AccessGuard>
  );
}

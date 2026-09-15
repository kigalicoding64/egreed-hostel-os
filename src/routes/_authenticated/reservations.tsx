import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarRange,
  LogIn,
  LogOut,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSetReservationStatus } from "@/hooks/use-reservations";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/LoadingState";
import { StatCard } from "@/components/common/StatCard";
import { AccessGuard } from "@/components/common/AccessGuard";
import { RoomCalendar } from "@/components/reservations/RoomCalendar";
import { ReservationWizard } from "@/components/reservations/ReservationWizard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { RESERVATION_SOURCE_LABELS } from "@/lib/hotel-constants";
import { todayISO } from "@/lib/booking";

export const Route = createFileRoute("/_authenticated/reservations")({
  head: () => ({
    meta: [
      { title: "Reservations | EGREED Hospitality" },
      {
        name: "description",
        content:
          "Create bookings with the reservation wizard, track booking sources and run check-in and check-out.",
      },
      { property: "og:title", content: "Reservations | EGREED Hospitality" },
      {
        property: "og:description",
        content: "Bookings, arrivals, departures and room assignment in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReservationsPage,
});

interface Reservation {
  id: string;
  reference: string;
  status: string;
  source: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  total_amount: number;
  guests: { full_name: string } | null;
  rooms: { room_number: string } | null;
}

function ReservationsPage() {
  const { roles, hasAnyRole } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [wizard, setWizard] = useState(false);
  const setResStatus = useSetReservationStatus();
  const today = todayISO();

  const canView =
    roles.includes("super_admin") ||
    hasAnyRole(["hotel_owner", "general_manager", "receptionist", "customer_support"]);
  const canEdit =
    roles.includes("super_admin") ||
    hasAnyRole(["hotel_owner", "general_manager", "receptionist"]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select(
          "id,reference,status,source,check_in,check_out,num_guests,total_amount,guests(full_name),rooms(room_number)",
        )
        .order("check_in", { ascending: false });
      if (error) throw error;
      return data as unknown as Reservation[];
    },
  });

  const filtered = data.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (r.reference.toLowerCase().includes(q.toLowerCase()) ||
        (r.guests?.full_name ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  const arrivals = data.filter(
    (r) => r.check_in === today && ["confirmed", "pending"].includes(r.status),
  ).length;
  const departures = data.filter(
    (r) => r.check_out === today && r.status === "checked_in",
  ).length;
  const inHouse = data.filter((r) => r.status === "checked_in").length;
  const pending = data.filter((r) => r.status === "pending").length;

  return (
    <AccessGuard allowed={canView} feature="reservations">
      <div className="space-y-6">
        <PageHeader
          title="Reservations"
          description="Manage guest bookings, arrivals and departures."
          icon={<CalendarCheck className="h-5 w-5" />}
          actions={
            canEdit ? (
              <Button size="sm" onClick={() => setWizard(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> New reservation
              </Button>
            ) : null
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard index={0} label="Arrivals today" value={arrivals} icon={LogIn} accent="success" />
          <StatCard index={1} label="Departures today" value={departures} icon={LogOut} accent="warning" />
          <StatCard index={2} label="In house" value={inHouse} icon={CalendarCheck} accent="info" />
          <StatCard index={3} label="Pending requests" value={pending} icon={CalendarRange} accent="primary" />
        </div>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            <RoomCalendar days={14} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <Card className="shadow-card">
              <CardContent className="p-0">
                <div className="flex flex-wrap gap-3 border-b p-4">
                  <div className="relative max-w-xs flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search reservations…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="checked_in">Checked in</SelectItem>
                      <SelectItem value="checked_out">Checked out</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isLoading ? (
                  <div className="p-6">
                    <TableSkeleton />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={CalendarCheck}
                      title="No reservations found"
                      description="New bookings will appear here."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Guest</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Check-out</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          {canEdit && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                            <TableCell className="font-medium">
                              {r.guests?.full_name ?? "—"}
                            </TableCell>
                            <TableCell>{r.rooms?.room_number ?? "Unassigned"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {RESERVATION_SOURCE_LABELS[r.source] ?? r.source}
                            </TableCell>
                            <TableCell>{formatDate(r.check_in)}</TableCell>
                            <TableCell>{formatDate(r.check_out)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(r.total_amount)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={r.status} />
                            </TableCell>
                            {canEdit && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {r.status === "pending" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={setResStatus.isPending}
                                      onClick={() =>
                                        setResStatus.mutate({ id: r.id, status: "confirmed" })
                                      }
                                    >
                                      Confirm
                                    </Button>
                                  )}
                                  {["confirmed", "pending"].includes(r.status) && (
                                    <Button
                                      size="sm"
                                      disabled={setResStatus.isPending}
                                      onClick={() =>
                                        setResStatus.mutate({ id: r.id, status: "checked_in" })
                                      }
                                    >
                                      <LogIn className="mr-1 h-3.5 w-3.5" /> Check in
                                    </Button>
                                  )}
                                  {r.status === "checked_in" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={setResStatus.isPending}
                                      onClick={() =>
                                        setResStatus.mutate({ id: r.id, status: "checked_out" })
                                      }
                                    >
                                      <LogOut className="mr-1 h-3.5 w-3.5" /> Check out
                                    </Button>
                                  )}
                                  {["confirmed", "pending"].includes(r.status) && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="Cancel reservation"
                                      disabled={setResStatus.isPending}
                                      onClick={() =>
                                        setResStatus.mutate({ id: r.id, status: "cancelled" })
                                      }
                                    >
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ReservationWizard open={wizard} onOpenChange={setWizard} />
      </div>
    </AccessGuard>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Search } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/LoadingState";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reservations")({
  component: ReservationsPage,
});

interface Reservation {
  id: string;
  reference: string;
  status: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  total_amount: number;
  guests: { full_name: string } | null;
  rooms: { room_number: string } | null;
}

function ReservationsPage() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id,reference,status,check_in,check_out,num_guests,total_amount,guests(full_name),rooms(room_number)")
        .order("check_in", { ascending: false });
      if (error) throw error;
      return data as unknown as Reservation[];
    },
  });

  const filtered = data.filter(
    (r) =>
      r.reference.toLowerCase().includes(q.toLowerCase()) ||
      (r.guests?.full_name ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations"
        description="Manage guest bookings, arrivals and departures."
        icon={<CalendarCheck className="h-5 w-5" />}
      />
      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search reservations…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={CalendarCheck} title="No reservations found" description="New bookings will appear here." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                    <TableCell className="font-medium">{r.guests?.full_name ?? "—"}</TableCell>
                    <TableCell>{r.rooms?.room_number ?? "Unassigned"}</TableCell>
                    <TableCell>{formatDate(r.check_in)}</TableCell>
                    <TableCell>{formatDate(r.check_out)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.total_amount)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

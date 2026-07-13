import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BedDouble,
  Search,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  ArrowUpDown,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCardsSkeleton } from "@/components/common/LoadingState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { ROOM_STATUSES, ROOM_STATUS_LABELS } from "@/lib/hotel-constants";
import { RoomFormDialog } from "@/components/rooms/RoomFormDialog";
import {
  RoomDetailSheet,
  type RoomWithRefs,
} from "@/components/rooms/RoomDetailSheet";

export const Route = createFileRoute("/_authenticated/rooms")({
  component: RoomsPage,
});

const SORTS = [
  { value: "room_number", label: "Room Number" },
  { value: "base_price", label: "Price" },
  { value: "max_guests", label: "Capacity" },
  { value: "status", label: "Status" },
] as const;

function RoomsPage() {
  const { isManagement } = useAuth();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<string>("room_number");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoomWithRefs | null>(null);
  const [detail, setDetail] = useState<RoomWithRefs | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select(
          "id,room_number,room_name,floor_id,room_type_id,status,capacity,num_beds,max_guests,bed_types,room_size,base_price,weekend_price,seasonal_price,cleaning_status,maintenance_status,description,internal_notes,room_types(name),floors(name,buildings(name))",
        )
        .order("room_number");
      if (error) throw error;
      return data as unknown as RoomWithRefs[];
    },
  });

  const filtered = useMemo(() => {
    let rows = filter === "all" ? data : data.filter((r) => r.status === filter);
    if (q.trim()) {
      const term = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.room_number.toLowerCase().includes(term) ||
          (r.room_name ?? "").toLowerCase().includes(term) ||
          (r.room_types?.name ?? "").toLowerCase().includes(term),
      );
    }
    return [...rows].sort((a, b) => {
      if (sort === "base_price") return (b.base_price ?? 0) - (a.base_price ?? 0);
      if (sort === "max_guests") return b.max_guests - a.max_guests;
      if (sort === "status") return a.status.localeCompare(b.status);
      return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
    });
  }, [data, filter, q, sort]);

  const openEdit = (room: RoomWithRefs) => {
    setDetail(null);
    setEditing(room);
    setFormOpen(true);
  };

  const filterChips = ["all", ...ROOM_STATUSES];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rooms"
        description="Live room inventory, pricing and housekeeping status."
        icon={<BedDouble className="h-5 w-5" />}
        actions={
          isManagement && (
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> New Room
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rooms…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[160px]">
              <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border p-0.5">
            <Button
              variant={view === "cards" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView("cards")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView("table")}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterChips.map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : ROOM_STATUS_LABELS[f]}
            <span className="ml-1.5 text-xs opacity-70">
              {f === "all" ? data.length : data.filter((r) => r.status === f).length}
            </span>
          </Button>
        ))}
      </div>

      {isLoading ? (
        <StatCardsSkeleton count={8} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={BedDouble} title="No rooms in this view" />
      ) : view === "cards" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filtered.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
            >
              <Card
                onClick={() => setDetail(room)}
                className={cn(
                  "relative cursor-pointer overflow-hidden p-4 shadow-card transition-shadow hover:shadow-elegant",
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold">{room.room_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {room.room_name || room.room_types?.name || "—"}
                    </p>
                  </div>
                  <StatusBadge status={room.status} />
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {room.max_guests}
                  </span>
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-3 w-3" /> {room.num_beds}
                  </span>
                  <span>{room.floors?.name ?? "—"}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {room.room_size ? `${room.room_size} m²` : ""}
                  </span>
                  <span className="font-semibold text-foreground">
                    {room.base_price ? formatCurrency(room.base_price) : "—"}
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Beds</TableHead>
                <TableHead className="text-right">Base Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((room) => (
                <TableRow
                  key={room.id}
                  className="cursor-pointer"
                  onClick={() => setDetail(room)}
                >
                  <TableCell className="font-medium">
                    {room.room_number}
                    {room.room_name && (
                      <span className="ml-2 text-xs text-muted-foreground">{room.room_name}</span>
                    )}
                  </TableCell>
                  <TableCell>{room.room_types?.name ?? "—"}</TableCell>
                  <TableCell>{room.floors?.name ?? "—"}</TableCell>
                  <TableCell>{room.max_guests}</TableCell>
                  <TableCell>{room.num_beds}</TableCell>
                  <TableCell className="text-right font-medium">
                    {room.base_price ? formatCurrency(room.base_price) : "—"}
                  </TableCell>
                  <TableCell><StatusBadge status={room.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <RoomFormDialog open={formOpen} onOpenChange={setFormOpen} room={editing} />
      <RoomDetailSheet
        room={detail}
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        onEdit={openEdit}
        canManage={isManagement}
      />
    </div>
  );
}

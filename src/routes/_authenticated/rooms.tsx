import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BedDouble } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCardsSkeleton } from "@/components/common/LoadingState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/rooms")({
  component: RoomsPage,
});

interface Room {
  id: string;
  room_number: string;
  status: string;
  room_types: { name: string; base_rate: number } | null;
  floors: { name: string } | null;
}

const FILTERS = ["all", "available", "occupied", "reserved", "dirty", "cleaning"];

function RoomsPage() {
  const [filter, setFilter] = useState("all");
  const { data = [], isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id,room_number,status,room_types(name,base_rate),floors(name)")
        .order("room_number");
      if (error) throw error;
      return data as unknown as Room[];
    },
  });

  const filtered = filter === "all" ? data : data.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rooms"
        description="Live room inventory and housekeeping status."
        icon={<BedDouble className="h-5 w-5" />}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
            {f !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                {data.filter((r) => r.status === f).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <StatCardsSkeleton count={8} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={BedDouble} title="No rooms in this view" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filtered.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
            >
              <Card
                className={cn(
                  "relative overflow-hidden p-4 shadow-card transition-shadow hover:shadow-elegant",
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold">{room.room_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {room.room_types?.name ?? "—"}
                    </p>
                  </div>
                  <StatusBadge status={room.status} />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{room.floors?.name ?? "—"}</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(room.room_types?.base_rate ?? 0)}
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

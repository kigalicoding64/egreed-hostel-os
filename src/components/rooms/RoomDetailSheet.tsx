import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BedDouble,
  Ruler,
  Users,
  Layers,
  Pencil,
  Sparkles,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { ROOM_STATUSES, ROOM_STATUS_LABELS } from "@/lib/hotel-constants";
import type { RoomRecord } from "./RoomFormDialog";

export interface RoomWithRefs extends RoomRecord {
  room_types: { name: string } | null;
  floors: { name: string; buildings?: { name: string } | null } | null;
}

export function RoomDetailSheet({
  room,
  open,
  onOpenChange,
  onEdit,
  canManage,
}: {
  room: RoomWithRefs | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (room: RoomWithRefs) => void;
  canManage: boolean;
}) {
  const qc = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!room) return;
      const { error } = await supabase
        .from("rooms")
        .update({ status: status as RoomRecord["status"] })
        .eq("id", room.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Room status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!room) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl">Room {room.room_number}</SheetTitle>
            <StatusBadge status={room.status} />
          </div>
          <SheetDescription>
            {room.room_name || room.room_types?.name || "Room details"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Metric icon={Layers} label="Floor"
              value={room.floors ? `${room.floors.buildings?.name ? room.floors.buildings.name + " · " : ""}${room.floors.name}` : "—"} />
            <Metric icon={BedDouble} label="Type" value={room.room_types?.name ?? "—"} />
            <Metric icon={Users} label="Max Guests" value={String(room.max_guests)} />
            <Metric icon={BedDouble} label="Beds" value={String(room.num_beds)} />
            <Metric icon={Ruler} label="Size" value={room.room_size ? `${room.room_size} m²` : "—"} />
            <Metric icon={Users} label="Capacity" value={String(room.capacity)} />
          </div>

          {room.bed_types.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Bed Types</p>
              <div className="flex flex-wrap gap-1.5">
                {room.bed_types.map((b) => (
                  <Badge key={b} variant="secondary">{b}</Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Pricing</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <PriceCell label="Base" value={room.base_price} />
              <PriceCell label="Weekend" value={room.weekend_price} />
              <PriceCell label="Seasonal" value={room.seasonal_price} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Cleaning:</span>
              <span className="font-medium capitalize">{room.cleaning_status.replace("_", " ")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Maint:</span>
              <span className="font-medium capitalize">{room.maintenance_status.replace("_", " ")}</span>
            </div>
          </div>

          {room.description && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
              <p className="text-sm">{room.description}</p>
            </div>
          )}
          {canManage && room.internal_notes && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Internal Notes</p>
              <p className="text-sm">{room.internal_notes}</p>
            </div>
          )}

          {canManage && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Quick status change</p>
                  <Select value={room.status} onValueChange={(v) => statusMutation.mutate(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROOM_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{ROOM_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => onEdit(room)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit Room
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function PriceCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-semibold">{value ? formatCurrency(value) : "—"}</p>
    </div>
  );
}

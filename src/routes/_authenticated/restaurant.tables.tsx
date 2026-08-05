import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Table2, Plus, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TonedBadge } from "@/components/common/TonedBadge";
import { OutletSwitcher } from "@/components/restaurant/OutletSwitcher";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  TABLE_STATUSES,
  TABLE_STATUS_LABELS,
  TABLE_STATUS_TONE,
} from "@/lib/restaurant-constants";
import {
  useOutlets,
  useTables,
  useRmsAccess,
  type RestaurantTable,
} from "@/hooks/use-restaurant";

export const Route = createFileRoute("/_authenticated/restaurant/tables")({
  head: () => ({
    meta: [
      { title: "Floor Plan & Tables — EGREED Hospitality Enterprise" },
      {
        name: "description",
        content:
          "Interactive restaurant floor plan: drag tables into position, track occupancy and manage seating capacity.",
      },
      { property: "og:title", content: "Floor Plan — EGREED Hospitality" },
      {
        property: "og:description",
        content: "Drag-and-drop table layout with live occupancy status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TablesPage,
});

const GRID = 20;

function TablesPage() {
  const { outlet, outletId, select } = useOutlets();
  const { canSell, isManager } = useRmsAccess();
  const { data: tables = [], isLoading } = useTables(outletId);
  const qc = useQueryClient();
  const canvas = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [creating, setCreating] = useState(false);

  const stats = useMemo(() => {
    const by = (s: string) => tables.filter((t) => t.status === s).length;
    return {
      total: tables.length,
      seats: tables.reduce((s, t) => s + t.seats, 0),
      available: by("available"),
      occupied: by("occupied"),
    };
  }, [tables]);

  const move = useMutation({
    mutationFn: async ({ id, x, y }: { id: string; x: number; y: number }) => {
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ pos_x: x, pos_y: y })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rms-tables"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ status: status as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rms-tables"] });
      toast.success("Table updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onDrop = (e: React.MouseEvent) => {
    if (!dragging || !canvas.current) return;
    const rect = canvas.current.getBoundingClientRect();
    const x = Math.max(0, Math.round((e.clientX - rect.left - 40) / GRID) * GRID);
    const y = Math.max(0, Math.round((e.clientY - rect.top - 40) / GRID) * GRID);
    move.mutate({ id: dragging, x, y });
    setDragging(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Floor Plan"
        description="Arrange the room, follow occupancy and turn tables faster."
        icon={<Table2 className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            {isManager && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" /> Table
              </Button>
            )}
            <OutletSwitcher value={outletId} onChange={select} />
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 text-sm">
        <Card className="px-4 py-2">
          <span className="text-muted-foreground">Tables</span>{" "}
          <span className="font-semibold">{stats.total}</span>
        </Card>
        <Card className="px-4 py-2">
          <span className="text-muted-foreground">Seats</span>{" "}
          <span className="font-semibold">{stats.seats}</span>
        </Card>
        <Card className="px-4 py-2">
          <span className="text-muted-foreground">Available</span>{" "}
          <span className="font-semibold text-success">{stats.available}</span>
        </Card>
        <Card className="px-4 py-2">
          <span className="text-muted-foreground">Occupied</span>{" "}
          <span className="font-semibold text-warning">{stats.occupied}</span>
        </Card>
      </div>

      {isLoading ? (
        <Skeleton className="h-[480px] rounded-xl" />
      ) : tables.length === 0 ? (
        <EmptyState
          icon={Table2}
          title="No tables yet"
          description={`Add tables to ${outlet?.name ?? "this outlet"} to build the floor plan.`}
          action={
            isManager ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add table
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card
          ref={canvas}
          onClick={onDrop}
          className={cn(
            "relative h-[520px] overflow-auto bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] [background-size:20px_20px]",
            dragging && "cursor-crosshair ring-2 ring-primary/40",
          )}
        >
          {tables.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (dragging === t.id) setDragging(null);
                else setEditing(t);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (isManager) setDragging(t.id);
              }}
              style={{ left: t.pos_x, top: t.pos_y }}
              className={cn(
                "absolute flex h-20 w-20 flex-col items-center justify-center border-2 bg-card text-xs shadow-sm transition",
                t.shape === "round" ? "rounded-full" : "rounded-lg",
                dragging === t.id && "ring-2 ring-primary",
                t.status === "available" && "border-success/60",
                t.status === "occupied" && "border-warning/60",
                t.status === "reserved" && "border-info/60",
                t.status === "cleaning" && "border-primary/60",
                t.status === "out_of_service" && "border-destructive/60 opacity-60",
              )}
            >
              <span className="font-semibold">{t.name}</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" /> {t.seats}
              </span>
              <TonedBadge tone={TABLE_STATUS_TONE[t.status]} className="mt-1 text-[10px]">
                {TABLE_STATUS_LABELS[t.status]}
              </TonedBadge>
            </button>
          ))}
          <p className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
            {isManager
              ? dragging
                ? "Click anywhere to drop the table"
                : "Double-click a table to move it · click to edit"
              : "Click a table to update its status"}
          </p>
        </Card>
      )}

      <TableDialog
        open={creating}
        outletId={outletId}
        hotelId={outlet?.hotel_id ?? null}
        onOpenChange={setCreating}
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Status</Label>
            <Select
              value={editing?.status}
              onValueChange={(v) => {
                if (!editing) return;
                setStatus.mutate({ id: editing.id, status: v });
                setEditing(null);
              }}
              disabled={!canSell}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TABLE_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {editing?.seats} seats · {editing?.shape}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TableDialog({
  open,
  onOpenChange,
  outletId,
  hotelId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  outletId: string | null;
  hotelId: string | null;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("4");
  const [shape, setShape] = useState("square");

  const create = useMutation({
    mutationFn: async () => {
      if (!outletId || !hotelId) throw new Error("Select an outlet first");
      const { error } = await supabase.from("restaurant_tables").insert({
        hotel_id: hotelId,
        outlet_id: outletId,
        name: name.trim(),
        seats: Number(seats) || 2,
        shape,
        pos_x: 40,
        pos_y: 40,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rms-tables"] });
      toast.success("Table added");
      setName("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New table</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tname">Name</Label>
            <Input id="tname" value={name} onChange={(e) => setName(e.target.value)} placeholder="T12" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tseats">Seats</Label>
              <Input
                id="tseats"
                type="number"
                min={1}
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Shape</Label>
              <Select value={shape} onValueChange={setShape}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="round">Round</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
          >
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

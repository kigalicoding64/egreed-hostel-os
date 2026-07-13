import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHotelRef } from "@/hooks/use-hotel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ROOM_STATUSES,
  type RoomStatus,
  ROOM_STATUS_LABELS,
  BED_TYPES,
  CLEANING_STATUSES,
  CLEANING_STATUS_LABELS,
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
} from "@/lib/hotel-constants";

export interface RoomRecord {
  id: string;
  room_number: string;
  room_name: string | null;
  floor_id: string | null;
  room_type_id: string | null;
  status: string;
  capacity: number;
  num_beds: number;
  max_guests: number;
  bed_types: string[];
  room_size: number | null;
  base_price: number | null;
  weekend_price: number | null;
  seasonal_price: number | null;
  cleaning_status: string;
  maintenance_status: string;
  description: string | null;
  internal_notes: string | null;
}

type FormState = Omit<RoomRecord, "id"> & { id?: string };

const emptyForm: FormState = {
  room_number: "",
  room_name: "",
  floor_id: null,
  room_type_id: null,
  status: "available",
  capacity: 2,
  num_beds: 1,
  max_guests: 2,
  bed_types: [],
  room_size: null,
  base_price: null,
  weekend_price: null,
  seasonal_price: null,
  cleaning_status: "clean",
  maintenance_status: "ok",
  description: "",
  internal_notes: "",
};

export function RoomFormDialog({
  open,
  onOpenChange,
  room,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  room?: RoomRecord | null;
}) {
  const qc = useQueryClient();
  const { data: ref } = useHotelRef();
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (open) setForm(room ? { ...emptyForm, ...room } : emptyForm);
  }, [open, room]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleBed = (bed: string) =>
    setForm((f) => ({
      ...f,
      bed_types: f.bed_types.includes(bed)
        ? f.bed_types.filter((b) => b !== bed)
        : [...f.bed_types, bed],
    }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.room_number.trim()) throw new Error("Room number is required");
      const payload = {
        room_number: form.room_number.trim(),
        room_name: form.room_name || null,
        floor_id: form.floor_id,
        room_type_id: form.room_type_id,
        status: form.status as RoomStatus,
        capacity: form.capacity,
        num_beds: form.num_beds,
        max_guests: form.max_guests,
        bed_types: form.bed_types,
        room_size: form.room_size,
        base_price: form.base_price,
        weekend_price: form.weekend_price,
        seasonal_price: form.seasonal_price,
        cleaning_status: form.cleaning_status,
        maintenance_status: form.maintenance_status,
        description: form.description || null,
        internal_notes: form.internal_notes || null,
      };
      if (room?.id) {
        const { error } = await supabase
          .from("rooms")
          .update(payload)
          .eq("id", room.id);
        if (error) throw error;
      } else {
        if (!ref?.hotelId) throw new Error("No active hotel configured");
        const { error } = await supabase
          .from("rooms")
          .insert({ ...payload, hotel_id: ref.hotelId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      toast.success(room ? "Room updated" : "Room created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{room ? "Edit Room" : "New Room"}</DialogTitle>
          <DialogDescription>
            Configure the room details, capacity and pricing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Room Number *">
              <Input
                value={form.room_number}
                onChange={(e) => set("room_number", e.target.value)}
                placeholder="101"
              />
            </Field>
            <Field label="Room Name">
              <Input
                value={form.room_name ?? ""}
                onChange={(e) => set("room_name", e.target.value)}
                placeholder="Deluxe Garden View"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Floor">
              <Select
                value={form.floor_id ?? "none"}
                onValueChange={(v) => set("floor_id", v === "none" ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Select floor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {ref?.floors.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.building ? `${f.building} · ` : ""}{f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Room Type">
              <Select
                value={form.room_type_id ?? "none"}
                onValueChange={(v) => set("room_type_id", v === "none" ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {ref?.roomTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Capacity">
              <Input type="number" min={1} value={form.capacity}
                onChange={(e) => set("capacity", Number(e.target.value))} />
            </Field>
            <Field label="Beds">
              <Input type="number" min={0} value={form.num_beds}
                onChange={(e) => set("num_beds", Number(e.target.value))} />
            </Field>
            <Field label="Max Guests">
              <Input type="number" min={1} value={form.max_guests}
                onChange={(e) => set("max_guests", Number(e.target.value))} />
            </Field>
          </div>

          <Field label="Bed Types">
            <div className="flex flex-wrap gap-2">
              {BED_TYPES.map((bed) => (
                <button
                  key={bed}
                  type="button"
                  onClick={() => toggleBed(bed)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    form.bed_types.includes(bed)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {bed}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-4 gap-4">
            <Field label="Size (m²)">
              <Input type="number" min={0} value={form.room_size ?? ""}
                onChange={(e) => set("room_size", num(e.target.value))} />
            </Field>
            <Field label="Base Price">
              <Input type="number" min={0} value={form.base_price ?? ""}
                onChange={(e) => set("base_price", num(e.target.value))} />
            </Field>
            <Field label="Weekend Price">
              <Input type="number" min={0} value={form.weekend_price ?? ""}
                onChange={(e) => set("weekend_price", num(e.target.value))} />
            </Field>
            <Field label="Seasonal Price">
              <Input type="number" min={0} value={form.seasonal_price ?? ""}
                onChange={(e) => set("seasonal_price", num(e.target.value))} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOM_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{ROOM_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cleaning">
              <Select value={form.cleaning_status} onValueChange={(v) => set("cleaning_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLEANING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{CLEANING_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Maintenance">
              <Select value={form.maintenance_status} onValueChange={(v) => set("maintenance_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{MAINTENANCE_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Description">
            <Textarea rows={2} value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Guest-facing description of the room…" />
          </Field>
          <Field label="Internal Notes">
            <Textarea rows={2} value={form.internal_notes ?? ""}
              onChange={(e) => set("internal_notes", e.target.value)}
              placeholder="Staff-only notes…" />
          </Field>

          {form.bed_types.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {form.bed_types.map((b) => (
                <Badge key={b} variant="secondary">{b}</Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : room ? "Save Changes" : "Create Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

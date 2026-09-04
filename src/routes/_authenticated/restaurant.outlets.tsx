import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, Plus, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RmsGuard } from "@/components/restaurant/RmsGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TonedBadge } from "@/components/common/TonedBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useHotelRef } from "@/hooks/use-hotel";
import { useOutlets, useRmsAccess } from "@/hooks/use-restaurant";
import { OUTLET_TYPES, OUTLET_TYPE_LABELS } from "@/lib/restaurant-constants";

export const Route = createFileRoute("/_authenticated/restaurant/outlets")({
  head: () => ({
    meta: [
      { title: "Outlets — EGREED Hospitality Enterprise" },
      {
        name: "description",
        content:
          "Configure restaurants, bars, coffee shops and room-service outlets with trading hours, tax and service charge rules.",
      },
      { property: "og:title", content: "Outlets — EGREED Hospitality" },
      {
        property: "og:description",
        content: "Trading hours, tax and service charge configuration per outlet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OutletsPage,
});

function OutletsPage() {
  const rmsAccess = useRmsAccess();
  const { outlets, isLoading } = useOutlets();
  const { isManager } = useRmsAccess();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("outlets").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rms-outlets"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <RmsGuard allowed={rmsAccess.canManageOutlets} feature="Outlet setup">
    <div className="space-y-6">
      <PageHeader
        title="Outlets"
        description="Every revenue point in the property, with its own tax and service rules."
        icon={<Store className="h-5 w-5" />}
        actions={
          isManager ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" /> Outlet
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : outlets.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No outlets configured"
          description="Add a restaurant, bar or room-service outlet to begin trading."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outlets.map((o) => (
            <Card key={o.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{o.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {OUTLET_TYPE_LABELS[o.type] ?? o.type}
                    {o.location ? ` · ${o.location}` : ""}
                  </p>
                </div>
                <TonedBadge tone={o.is_active ? "success" : "neutral"}>
                  {o.is_active ? "Trading" : "Closed"}
                </TonedBadge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {o.opens_at?.slice(0, 5)} – {o.closes_at?.slice(0, 5)}
              </div>
              <div className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                <div>
                  <p className="text-muted-foreground">VAT</p>
                  <p className="font-semibold">{o.tax_rate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Service</p>
                  <p className="font-semibold">{o.service_charge_rate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Currency</p>
                  <p className="font-semibold">{o.currency}</p>
                </div>
              </div>
              {isManager && (
                <div className="flex items-center gap-2 border-t pt-3">
                  <Switch
                    checked={o.is_active}
                    onCheckedChange={(v) => toggle.mutate({ id: o.id, active: v })}
                  />
                  <span className="text-xs text-muted-foreground">Accepting orders</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <OutletDialog open={creating} onOpenChange={setCreating} />
    </div>
    </RmsGuard>
  );
}

function OutletDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const { data: ref } = useHotelRef();
  const [form, setForm] = useState({
    name: "",
    type: "restaurant",
    location: "",
    opens_at: "07:00",
    closes_at: "23:00",
    tax_rate: "18",
    service_charge_rate: "10",
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!ref?.hotelId) throw new Error("No active hotel");
      const { error } = await supabase.from("outlets").insert({
        hotel_id: ref.hotelId,
        name: form.name.trim(),
        type: form.type as never,
        location: form.location.trim() || null,
        opens_at: form.opens_at,
        closes_at: form.closes_at,
        tax_rate: Number(form.tax_rate) || 0,
        service_charge_rate: Number(form.service_charge_rate) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rms-outlets"] });
      toast.success("Outlet created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New outlet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="oname">Name</Label>
            <Input
              id="oname"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTLET_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {OUTLET_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oloc">Location</Label>
            <Input
              id="oloc"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ground floor"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oopen">Opens</Label>
            <Input
              id="oopen"
              type="time"
              value={form.opens_at}
              onChange={(e) => setForm({ ...form, opens_at: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oclose">Closes</Label>
            <Input
              id="oclose"
              type="time"
              value={form.closes_at}
              onChange={(e) => setForm({ ...form, closes_at: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="otax">VAT %</Label>
            <Input
              id="otax"
              type="number"
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="osrv">Service charge %</Label>
            <Input
              id="osrv"
              type="number"
              value={form.service_charge_rate}
              onChange={(e) => setForm({ ...form, service_charge_rate: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={!form.name.trim() || create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create outlet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

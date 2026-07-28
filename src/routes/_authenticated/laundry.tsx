import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shirt, Plus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useHotelRef } from "@/hooks/use-hotel";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { StatCardsSkeleton } from "@/components/common/LoadingState";
import { TonedBadge } from "@/components/common/TonedBadge";
import { ExportMenu } from "@/components/common/ExportMenu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  LAUNDRY_KIND_LABELS,
  LAUNDRY_KINDS,
  LAUNDRY_STATUS_LABELS,
  LAUNDRY_STATUSES,
} from "@/lib/operations-constants";

export const Route = createFileRoute("/_authenticated/laundry")({
  component: LaundryPage,
});

type Order = {
  id: string;
  reference: string;
  kind: string;
  status: string;
  damaged_count: number;
  replacement_cost: number;
  collected_at: string;
  delivered_at: string | null;
  notes: string | null;
  room_id: string | null;
  rooms: { room_number: string } | null;
  lines: { item: string; qty: number }[] | null;
};

const KIND_TONE: Record<string, string> = { linen: "info", uniform: "neutral", guest: "primary" };
const STATUS_TONE: Record<string, string> = {
  collected: "warning",
  washing: "info",
  drying: "info",
  ironing: "primary",
  delivered: "success",
  completed: "success",
};

function nextStatus(current: string): string | null {
  const flow = ["collected", "washing", "drying", "ironing", "delivered", "completed"];
  const i = flow.indexOf(current);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

function LaundryPage() {
  const qc = useQueryClient();
  const { data: hotel } = useHotelRef();
  const [tab, setTab] = useState<"orders" | "inventory">("orders");
  const [status, setStatus] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["laundry-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("laundry_orders")
        .select("id,reference,kind,status,damaged_count,replacement_cost,collected_at,delivered_at,notes,room_id,lines,rooms(room_number)")
        .order("collected_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as Order[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["laundry-items"],
    queryFn: async () => {
      const { data } = await supabase.from("laundry_items").select("*").order("name");
      return data as unknown as { id: string; name: string; kind: string; unit_cost: number; stock_on_hand: number; reorder_level: number }[];
    },
  });

  const filtered = useMemo(
    () => (status === "all" ? orders : orders.filter((o) => o.status === status)),
    [orders, status],
  );

  const stats = useMemo(() => {
    const s = { active: 0, delivered: 0, damaged: 0, replacement: 0 };
    orders.forEach((o) => {
      if (o.status !== "completed" && o.status !== "delivered") s.active++;
      else s.delivered++;
      s.damaged += o.damaged_count ?? 0;
      s.replacement += Number(o.replacement_cost ?? 0);
    });
    return s;
  }, [orders]);

  const advance = useMutation({
    mutationFn: async (o: Order) => {
      const next = nextStatus(o.status);
      if (!next) return;
      const patch: Record<string, unknown> = { status: next };
      if (next === "delivered") patch.delivered_at = new Date().toISOString();
      const { error } = await supabase.from("laundry_orders").update(patch).eq("id", o.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["laundry-orders"] });
      toast.success("Status advanced");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laundry"
        description="Track linen, uniforms and guest laundry through the wash cycle."
        icon={<Shirt className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              filename={`laundry-${new Date().toISOString().slice(0, 10)}`}
              title="Laundry Orders"
              rows={filtered}
              columns={[
                { header: "Ref", value: (r) => r.reference },
                { header: "Kind", value: (r) => LAUNDRY_KIND_LABELS[r.kind] ?? r.kind },
                { header: "Status", value: (r) => LAUNDRY_STATUS_LABELS[r.status] ?? r.status },
                { header: "Room", value: (r) => r.rooms?.room_number ?? "" },
                { header: "Damaged", value: (r) => r.damaged_count, align: "right" },
                { header: "Replacement", value: (r) => r.replacement_cost, align: "right" },
                { header: "Collected", value: (r) => formatDateTime(r.collected_at) },
              ]}
            />
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Order
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Active Cycles" value={stats.active} icon={Shirt} tone="info" />
          <StatCard label="Delivered" value={stats.delivered} icon={ArrowRight} tone="success" />
          <StatCard label="Damaged Items" value={stats.damaged} icon={Shirt} tone="warning" />
          <StatCard label="Replacement Cost" value={formatCurrency(stats.replacement)} icon={Shirt} tone="destructive" />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="orders">Wash Orders</TabsTrigger>
            <TabsTrigger value="inventory">Linen Inventory</TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === "orders" && (
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {LAUNDRY_STATUSES.map((s) => <SelectItem key={s} value={s}>{LAUNDRY_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {tab === "orders" ? (
        filtered.length === 0 ? (
          <EmptyState icon={Shirt} title="No laundry orders" description="Create a wash order to start tracking." />
        ) : (
          <Card className="shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Damaged</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead className="text-right">Next Step</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.reference}</TableCell>
                    <TableCell><TonedBadge tone={KIND_TONE[o.kind]}>{LAUNDRY_KIND_LABELS[o.kind]}</TonedBadge></TableCell>
                    <TableCell className="text-sm">{o.rooms?.room_number ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {(o.lines ?? []).map((l, i) => (
                        <span key={i} className="mr-2">{l.qty}× {l.item}</span>
                      ))}
                    </TableCell>
                    <TableCell><TonedBadge tone={STATUS_TONE[o.status]}>{LAUNDRY_STATUS_LABELS[o.status]}</TonedBadge></TableCell>
                    <TableCell className="text-sm">{o.damaged_count > 0 ? `${o.damaged_count} (${formatCurrency(o.replacement_cost)})` : "—"}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(o.collected_at)}</TableCell>
                    <TableCell className="text-right">
                      {nextStatus(o.status) && (
                        <Button size="sm" variant="outline" onClick={() => advance.mutate(o)}>
                          {LAUNDRY_STATUS_LABELS[nextStatus(o.status)!]}
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      ) : items.length === 0 ? (
        <EmptyState icon={Shirt} title="No linen items yet" description="Managers can add sheets, towels and uniforms." />
      ) : (
        <Card className="shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">In Stock</TableHead>
                <TableHead className="text-right">Reorder At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => {
                const low = it.stock_on_hand <= it.reorder_level;
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell>{LAUNDRY_KIND_LABELS[it.kind] ?? it.kind}</TableCell>
                    <TableCell className="text-right">{formatCurrency(it.unit_cost)}</TableCell>
                    <TableCell className="text-right">{it.stock_on_hand}</TableCell>
                    <TableCell className="text-right">{it.reorder_level}</TableCell>
                    <TableCell>
                      <TonedBadge tone={low ? "destructive" : "success"}>
                        {low ? "Reorder" : "OK"}
                      </TonedBadge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <LaundryFormDialog open={formOpen} onOpenChange={setFormOpen} hotelId={hotel?.hotelId ?? null} />
    </div>
  );
}

function LaundryFormDialog({
  open,
  onOpenChange,
  hotelId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hotelId: string | null;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [kind, setKind] = useState<string>("linen");
  const [roomId, setRoomId] = useState<string>("");
  const [linesText, setLinesText] = useState<string>("Sheets x 4\nTowels x 6");
  const [damaged, setDamaged] = useState<string>("0");
  const [cost, setCost] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms-picklist"],
    queryFn: async () => {
      const { data } = await supabase.from("rooms").select("id,room_number").order("room_number");
      return (data ?? []) as { id: string; room_number: string }[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!hotelId) throw new Error("No active hotel");
      const lines = linesText.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
        const m = line.match(/^(.+?)\s*[x×]\s*(\d+)\s*$/i);
        if (m) return { item: m[1].trim(), qty: Number(m[2]) };
        return { item: line, qty: 1 };
      });
      const { error } = await supabase.from("laundry_orders").insert({
        hotel_id: hotelId,
        kind: kind as "linen",
        room_id: roomId || null,
        lines,
        damaged_count: Number(damaged) || 0,
        replacement_cost: Number(cost) || 0,
        notes: notes || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["laundry-orders"] });
      toast.success("Laundry order created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Laundry Order</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kind</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LAUNDRY_KINDS.map((k) => <SelectItem key={k} value={k}>{LAUNDRY_KIND_LABELS[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Room (optional)</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Items (one per line, format: "Name x Qty")</Label>
            <Textarea rows={4} value={linesText} onChange={(e) => setLinesText(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Damaged Count</Label>
              <Input type="number" value={damaged} onChange={(e) => setDamaged(e.target.value)} />
            </div>
            <div>
              <Label>Replacement Cost</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

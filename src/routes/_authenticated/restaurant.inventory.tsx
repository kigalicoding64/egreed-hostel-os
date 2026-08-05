import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Boxes, AlertTriangle, PackagePlus, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TonedBadge } from "@/components/common/TonedBadge";
import { StatCard } from "@/components/common/StatCard";
import { ExportMenu } from "@/components/common/ExportMenu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { STOCK_MOVE_TYPES, STOCK_MOVE_LABELS } from "@/lib/restaurant-constants";
import { useInventory, useOutlets, useRmsAccess } from "@/hooks/use-restaurant";

export const Route = createFileRoute("/_authenticated/restaurant/inventory")({
  head: () => ({
    meta: [
      { title: "F&B Inventory — EGREED Hospitality Enterprise" },
      {
        name: "description",
        content:
          "Kitchen and bar stock control: stock on hand, reorder alerts, wastage logging and automatic recipe depletion.",
      },
      { property: "og:title", content: "F&B Inventory — EGREED Hospitality" },
      {
        property: "og:description",
        content: "Stock on hand, reorder alerts and wastage tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryPage,
});

interface StockRow {
  id: string;
  hotel_id: string;
  name: string;
  unit: string;
  category: string;
  stock_on_hand: number;
  reorder_level: number;
  unit_cost: number;
  supplier: string | null;
}

function InventoryPage() {
  const { outlet } = useOutlets();
  const { canManageInventory } = useRmsAccess();
  const { data, isLoading } = useInventory();
  const [search, setSearch] = useState("");
  const [moving, setMoving] = useState<StockRow | null>(null);

  const rows = (data ?? []) as unknown as StockRow[];
  const currency = outlet?.currency ?? "RWF";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) => !q || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const low = rows.filter((r) => Number(r.stock_on_hand) <= Number(r.reorder_level));
    const value = rows.reduce((s, r) => s + Number(r.stock_on_hand) * Number(r.unit_cost), 0);
    const out = rows.filter((r) => Number(r.stock_on_hand) <= 0);
    return { total: rows.length, low: low.length, out: out.length, value };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="F&B Inventory"
        description="Recipe-linked stock that depletes automatically with every sale."
        icon={<Boxes className="h-5 w-5" />}
        actions={
          <ExportMenu
            filename="fnb-inventory"
            title="F&B Inventory"
            columns={[
              { header: "Item", value: (r: StockRow) => r.name },
              { header: "Category", value: (r: StockRow) => r.category },
              { header: "On hand", value: (r: StockRow) => Number(r.stock_on_hand), align: "right" },
              { header: "Unit", value: (r: StockRow) => r.unit },
              { header: "Reorder", value: (r: StockRow) => Number(r.reorder_level), align: "right" },
              { header: "Unit cost", value: (r: StockRow) => Number(r.unit_cost), align: "right" },
              { header: "Supplier", value: (r: StockRow) => r.supplier ?? "—" },
            ]}
            rows={filtered}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tracked items" value={stats.total} icon={Boxes} accent="primary" index={0} />
        <StatCard label="Below reorder" value={stats.low} icon={AlertTriangle} accent="warning" index={1} />
        <StatCard label="Out of stock" value={stats.out} icon={AlertTriangle} accent="destructive" index={2} />
        <StatCard
          label="Stock value"
          value={formatCurrency(stats.value, currency)}
          icon={PackagePlus}
          accent="success"
          index={3}
        />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search stock…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No stock items"
          description="Add ingredients and link them to menu items for automatic depletion."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reorder</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const low = Number(r.stock_on_hand) <= Number(r.reorder_level);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category}</TableCell>
                    <TableCell className="text-right">
                      <TonedBadge
                        tone={Number(r.stock_on_hand) <= 0 ? "destructive" : low ? "warning" : "success"}
                      >
                        {Number(r.stock_on_hand).toFixed(2)} {r.unit}
                      </TonedBadge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {Number(r.reorder_level)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(r.unit_cost), currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.supplier ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {canManageInventory && (
                        <Button variant="ghost" size="sm" onClick={() => setMoving(r)}>
                          Adjust
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <MovementDialog item={moving} onClose={() => setMoving(null)} />
    </div>
  );
}

function MovementDialog({ item, onClose }: { item: StockRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState<string>("restock");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const quantity = Number(qty);
      if (!quantity) throw new Error("Enter a quantity");
      const delta = type === "restock" || type === "adjustment" ? quantity : -quantity;
      const { error } = await supabase.from("inventory_movements").insert({
        hotel_id: item.hotel_id,
        inventory_item_id: item.id,
        type: type as never,
        quantity,
        unit_cost: item.unit_cost,
        reason: reason.trim() || null,
      });
      if (error) throw error;
      const { error: upErr } = await supabase
        .from("inventory_items")
        .update({ stock_on_hand: Number(item.stock_on_hand) + delta })
        .eq("id", item.id);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rms-inventory"] });
      toast.success("Stock movement recorded");
      setQty("");
      setReason("");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust {item?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Movement type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCK_MOVE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {STOCK_MOVE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity ({item?.unit})</Label>
            <Input id="qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

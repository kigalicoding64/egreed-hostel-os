import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, ShieldCheck, AlertTriangle } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";
import { ASSET_CONDITION_LABELS, ASSET_CONDITIONS } from "@/lib/operations-constants";

export const Route = createFileRoute("/_authenticated/assets")({
  component: AssetsPage,
});

const COND_TONE: Record<string, string> = {
  excellent: "success",
  good: "info",
  fair: "warning",
  poor: "warning",
  out_of_service: "destructive",
};

type Asset = {
  id: string;
  code: string;
  name: string;
  category: string;
  serial_number: string | null;
  location: string | null;
  purchase_date: string | null;
  purchase_price: number;
  warranty_until: string | null;
  condition: string;
  depreciation_years: number;
  notes: string | null;
};

function AssetsPage() {
  const qc = useQueryClient();
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["maintenance_manager"]);
  const { data: hotel } = useHotelRef();
  const [q, setQ] = useState("");
  const [condition, setCondition] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as unknown as Asset[];
    },
  });

  const filtered = useMemo(() => {
    let rows = assets;
    if (condition !== "all") rows = rows.filter((a) => a.condition === condition);
    if (q.trim()) {
      const term = q.toLowerCase();
      rows = rows.filter((a) =>
        [a.name, a.category, a.code, a.serial_number, a.location].some((v) =>
          v?.toLowerCase().includes(term),
        ),
      );
    }
    return rows;
  }, [assets, q, condition]);

  const stats = useMemo(() => {
    const totalValue = assets.reduce((s, a) => s + Number(a.purchase_price ?? 0), 0);
    const oos = assets.filter((a) => a.condition === "out_of_service").length;
    const warrantyExpiring = assets.filter((a) => {
      if (!a.warranty_until) return false;
      const days = (new Date(a.warranty_until).getTime() - Date.now()) / 86400000;
      return days > 0 && days < 60;
    }).length;
    return { total: assets.length, value: totalValue, oos, warrantyExpiring };
  }, [assets]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Hotel equipment register with condition, warranty and depreciation tracking."
        icon={<Package className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              filename={`assets-${new Date().toISOString().slice(0, 10)}`}
              title="Asset Register"
              rows={filtered}
              columns={[
                { header: "Code", value: (r) => r.code },
                { header: "Name", value: (r) => r.name },
                { header: "Category", value: (r) => r.category },
                { header: "Serial", value: (r) => r.serial_number ?? "" },
                { header: "Location", value: (r) => r.location ?? "" },
                { header: "Condition", value: (r) => ASSET_CONDITION_LABELS[r.condition] ?? r.condition },
                { header: "Purchase", value: (r) => (r.purchase_date ? formatDate(r.purchase_date) : "") },
                { header: "Value", value: (r) => r.purchase_price, align: "right" },
                { header: "Warranty Until", value: (r) => (r.warranty_until ? formatDate(r.warranty_until) : "") },
              ]}
            />
            {canManage && (
              <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> New Asset
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total Assets" value={stats.total} icon={Package} />
          <StatCard label="Total Value" value={formatCurrency(stats.value)} icon={ShieldCheck} accent="success" />
          <StatCard label="Out of Service" value={stats.oos} icon={AlertTriangle} accent="destructive" />
          <StatCard label="Warranty Expiring" value={stats.warrantyExpiring} icon={AlertTriangle} accent="warning" />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            {ASSET_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{ASSET_CONDITION_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No assets" description="Managers can register hotel equipment here." />
      ) : (
        <Card className="shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Warranty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => canManage && (setEditing(a), setFormOpen(true))}>
                  <TableCell className="font-mono text-xs">{a.code}</TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-sm">{a.category}</TableCell>
                  <TableCell className="text-sm">{a.location ?? "—"}</TableCell>
                  <TableCell><TonedBadge tone={COND_TONE[a.condition]}>{ASSET_CONDITION_LABELS[a.condition]}</TonedBadge></TableCell>
                  <TableCell className="text-right">{formatCurrency(a.purchase_price)}</TableCell>
                  <TableCell className="text-sm">{a.warranty_until ? formatDate(a.warranty_until) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        hotelId={hotel?.hotelId ?? null}
        asset={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["assets"] })}
      />
    </div>
  );
}

function AssetFormDialog({
  open,
  onOpenChange,
  hotelId,
  asset,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hotelId: string | null;
  asset: Asset | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [serial, setSerial] = useState("");
  const [location, setLocation] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [warranty, setWarranty] = useState<string>("");
  const [condition, setCondition] = useState<string>("good");
  const [depreciation, setDepreciation] = useState<string>("5");
  const [notes, setNotes] = useState("");

  useMemo(() => {
    if (asset) {
      setName(asset.name); setCategory(asset.category);
      setSerial(asset.serial_number ?? ""); setLocation(asset.location ?? "");
      setPurchaseDate(asset.purchase_date ?? "");
      setPrice(String(asset.purchase_price ?? ""));
      setWarranty(asset.warranty_until ?? "");
      setCondition(asset.condition);
      setDepreciation(String(asset.depreciation_years ?? 5));
      setNotes(asset.notes ?? "");
    } else {
      setName(""); setCategory("general"); setSerial(""); setLocation("");
      setPurchaseDate(""); setPrice(""); setWarranty(""); setCondition("good");
      setDepreciation("5"); setNotes("");
    }
  }, [asset]);

  const save = useMutation({
    mutationFn: async () => {
      if (!hotelId) throw new Error("No active hotel");
      const payload = {
        hotel_id: hotelId, name, category,
        serial_number: serial || null, location: location || null,
        purchase_date: purchaseDate || null,
        purchase_price: Number(price) || 0,
        warranty_until: warranty || null,
        condition: condition as "good",
        depreciation_years: Number(depreciation) || 5,
        notes: notes || null,
      };
      if (asset) {
        const { error } = await supabase.from("assets").update(payload).eq("id", asset.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assets").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{asset ? `Asset ${asset.code}` : "New Asset"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <Label>Serial Number</Label>
            <Input value={serial} onChange={(e) => setSerial(e.target.value)} />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label>Condition</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{ASSET_CONDITION_LABELS[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Purchase Date</Label>
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
          <div>
            <Label>Purchase Price</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <Label>Warranty Until</Label>
            <Input type="date" value={warranty} onChange={(e) => setWarranty(e.target.value)} />
          </div>
          <div>
            <Label>Depreciation (years)</Label>
            <Input type="number" value={depreciation} onChange={(e) => setDepreciation(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

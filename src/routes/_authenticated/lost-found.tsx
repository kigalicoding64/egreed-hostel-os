import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, PackageCheck, Trash2, Archive } from "lucide-react";
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
import { formatDateTime } from "@/lib/format";
import { LOST_FOUND_STATUSES, LOST_FOUND_STATUS_LABELS } from "@/lib/operations-constants";

export const Route = createFileRoute("/_authenticated/lost-found")({
  component: LostFoundPage,
});

const STATUS_TONE: Record<string, string> = {
  stored: "info",
  claimed: "warning",
  returned: "success",
  disposed: "neutral",
};

type Item = {
  id: string;
  reference: string;
  item: string;
  description: string | null;
  location_found: string | null;
  storage_location: string | null;
  status: string;
  owner_name: string | null;
  owner_contact: string | null;
  found_at: string;
  returned_at: string | null;
};

function LostFoundPage() {
  const qc = useQueryClient();
  const { data: hotel } = useHotelRef();
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["lost-found"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lost_found")
        .select("id,reference,item,description,location_found,storage_location,status,owner_name,owner_contact,found_at,returned_at")
        .order("found_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Item[];
    },
  });

  const filtered = useMemo(() => {
    let rows = items;
    if (status !== "all") rows = rows.filter((r) => r.status === status);
    if (q.trim()) {
      const term = q.toLowerCase();
      rows = rows.filter((r) =>
        [r.item, r.description, r.location_found, r.owner_name, r.reference]
          .some((v) => v?.toLowerCase().includes(term)),
      );
    }
    return rows;
  }, [items, status, q]);

  const stats = useMemo(() => {
    const s = { stored: 0, claimed: 0, returned: 0, disposed: 0 };
    items.forEach((i) => { s[i.status as keyof typeof s] = (s[i.status as keyof typeof s] ?? 0) + 1; });
    return s;
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lost & Found"
        description="Register found items, match to owners and track return."
        icon={<Search className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              filename={`lost-found-${new Date().toISOString().slice(0, 10)}`}
              title="Lost & Found Register"
              rows={filtered}
              columns={[
                { header: "Ref", value: (r) => r.reference },
                { header: "Item", value: (r) => r.item },
                { header: "Location", value: (r) => r.location_found ?? "" },
                { header: "Storage", value: (r) => r.storage_location ?? "" },
                { header: "Status", value: (r) => LOST_FOUND_STATUS_LABELS[r.status] ?? r.status },
                { header: "Owner", value: (r) => r.owner_name ?? "" },
                { header: "Found", value: (r) => formatDateTime(r.found_at) },
              ]}
            />
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Register Item
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="In Storage" value={stats.stored} icon={Archive} tone="info" />
          <StatCard label="Claimed" value={stats.claimed} icon={PackageCheck} tone="warning" />
          <StatCard label="Returned" value={stats.returned} icon={PackageCheck} tone="success" />
          <StatCard label="Disposed" value={stats.disposed} icon={Trash2} />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search item, owner…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {LOST_FOUND_STATUSES.map((s) => <SelectItem key={s} value={s}>{LOST_FOUND_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No records" description="Register a found item to start tracking." />
      ) : (
        <Card className="shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Found In</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Found</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((it) => (
                <TableRow key={it.id} className="cursor-pointer" onClick={() => { setEditing(it); setFormOpen(true); }}>
                  <TableCell className="font-mono text-xs">{it.reference}</TableCell>
                  <TableCell className="font-medium">{it.item}</TableCell>
                  <TableCell className="text-sm">{it.location_found ?? "—"}</TableCell>
                  <TableCell className="text-sm">{it.storage_location ?? "—"}</TableCell>
                  <TableCell><TonedBadge tone={STATUS_TONE[it.status]}>{LOST_FOUND_STATUS_LABELS[it.status]}</TonedBadge></TableCell>
                  <TableCell className="text-sm">{it.owner_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatDateTime(it.found_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <LFFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        hotelId={hotel?.hotelId ?? null}
        item={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["lost-found"] })}
      />
    </div>
  );
}

function LFFormDialog({
  open,
  onOpenChange,
  hotelId,
  item,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hotelId: string | null;
  item: Item | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationFound, setLocationFound] = useState("");
  const [storage, setStorage] = useState("");
  const [status, setStatus] = useState<string>("stored");
  const [owner, setOwner] = useState("");
  const [contact, setContact] = useState("");
  const [returnNotes, setReturnNotes] = useState("");

  useMemo(() => {
    if (item) {
      setName(item.item); setDescription(item.description ?? "");
      setLocationFound(item.location_found ?? ""); setStorage(item.storage_location ?? "");
      setStatus(item.status); setOwner(item.owner_name ?? ""); setContact(item.owner_contact ?? "");
      setReturnNotes("");
    } else {
      setName(""); setDescription(""); setLocationFound(""); setStorage("");
      setStatus("stored"); setOwner(""); setContact(""); setReturnNotes("");
    }
  }, [item]);

  const save = useMutation({
    mutationFn: async () => {
      if (!hotelId) throw new Error("No active hotel");
      if (item) {
        const patch: Record<string, unknown> = {
          item: name, description: description || null,
          location_found: locationFound || null, storage_location: storage || null,
          status, owner_name: owner || null, owner_contact: contact || null,
          return_notes: returnNotes || null,
        };
        if (status === "returned" && !item.returned_at) patch.returned_at = new Date().toISOString();
        if (status === "claimed") patch.claimed_at = new Date().toISOString();
        const { error } = await supabase.from("lost_found").update(patch).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lost_found").insert({
          hotel_id: hotelId, item: name, description: description || null,
          location_found: locationFound || null, storage_location: storage || null,
          status: status as "stored",
          owner_name: owner || null, owner_contact: contact || null,
          found_by: user?.id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{item ? `Item ${item.reference}` : "Register Found Item"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Item</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Black wallet" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Found In</Label>
              <Input value={locationFound} onChange={(e) => setLocationFound(e.target.value)} placeholder="Room 204, Lobby…" />
            </div>
            <div>
              <Label>Storage</Label>
              <Input value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="Safe A-3" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOST_FOUND_STATUSES.map((s) => <SelectItem key={s} value={s}>{LOST_FOUND_STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Owner Name</Label>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Owner Contact</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
            {item && status === "returned" && (
              <div className="col-span-2">
                <Label>Return Notes</Label>
                <Textarea rows={2} value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
              </div>
            )}
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

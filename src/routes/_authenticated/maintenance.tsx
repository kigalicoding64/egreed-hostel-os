import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Wrench, Plus, AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { formatDateTime, formatCurrency } from "@/lib/format";
import {
  MAINT_CATEGORIES,
  MAINT_CATEGORY_LABELS,
  MAINT_PRIORITIES,
  MAINT_PRIORITY_LABELS,
  MAINT_STATUS_LABELS,
  MAINT_STATUS_TONE,
  MAINT_STATUSES,
  PRIORITY_TONE,
} from "@/lib/operations-constants";

export const Route = createFileRoute("/_authenticated/maintenance")({
  component: MaintenancePage,
});

type Ticket = {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  cost: number;
  reported_by: string | null;
  assigned_to: string | null;
  room_id: string | null;
  asset_id: string | null;
  location: string | null;
  reported_at: string;
  resolved_at: string | null;
  rooms: { room_number: string } | null;
  assignee: { full_name: string } | null;
  reporter: { full_name: string } | null;
};

function MaintenancePage() {
  const { user, hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["maintenance_manager"]);
  const qc = useQueryClient();
  const { data: hotel } = useHotelRef();
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [status, setStatus] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["maint-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select(
          "id,reference,title,description,category,priority,status,cost,reported_by,assigned_to,room_id,asset_id,location,reported_at,resolved_at,rooms(room_number),assignee:profiles!maintenance_tickets_assigned_to_fkey(full_name),reporter:profiles!maintenance_tickets_reported_by_fkey(full_name)",
        )
        .order("reported_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as Ticket[];
    },
  });

  const filtered = useMemo(() => {
    let rows = tickets;
    if (tab === "mine") rows = rows.filter((t) => t.assigned_to === user?.id || t.reported_by === user?.id);
    if (status !== "all") rows = rows.filter((t) => t.status === status);
    return rows;
  }, [tickets, tab, status, user?.id]);

  const stats = useMemo(() => {
    const s = { open: 0, inProgress: 0, resolved: 0, critical: 0 };
    tickets.forEach((t) => {
      if (["open", "assigned"].includes(t.status)) s.open++;
      else if (t.status === "in_progress") s.inProgress++;
      else if (["resolved", "closed"].includes(t.status)) s.resolved++;
      if (t.priority === "critical" && !["resolved", "closed", "cancelled"].includes(t.status)) s.critical++;
    });
    return s;
  }, [tickets]);

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("maintenance_tickets").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maint-tickets"] });
      toast.success("Ticket updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Work orders, tickets and preventive maintenance."
        icon={<Wrench className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              filename={`maintenance-${new Date().toISOString().slice(0, 10)}`}
              title="Maintenance Tickets"
              rows={filtered}
              columns={[
                { header: "Ref", value: (r) => r.reference },
                { header: "Title", value: (r) => r.title },
                { header: "Category", value: (r) => MAINT_CATEGORY_LABELS[r.category] ?? r.category },
                { header: "Priority", value: (r) => MAINT_PRIORITY_LABELS[r.priority] ?? r.priority },
                { header: "Status", value: (r) => MAINT_STATUS_LABELS[r.status] ?? r.status },
                { header: "Room", value: (r) => r.rooms?.room_number ?? "" },
                { header: "Assignee", value: (r) => r.assignee?.full_name ?? "" },
                { header: "Cost", value: (r) => r.cost ?? 0, align: "right" },
                { header: "Reported", value: (r) => formatDateTime(r.reported_at) },
              ]}
            />
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Report Issue
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Open Tickets" value={stats.open} icon={AlertTriangle} tone="warning" />
          <StatCard label="In Progress" value={stats.inProgress} icon={Clock} tone="info" />
          <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} tone="success" />
          <StatCard label="Critical" value={stats.critical} icon={TrendingUp} tone="destructive" />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All Tickets</TabsTrigger>
            <TabsTrigger value="mine">My Tickets</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {MAINT_STATUSES.map((s) => <SelectItem key={s} value={s}>{MAINT_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Wrench} title="No maintenance tickets" description="Report an issue to open a work order." />
      ) : (
        <Card className="shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t, i) => (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.01, 0.2) }}
                  className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                  onClick={() => { setEditing(t); setFormOpen(true); }}
                >
                  <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell className="text-sm">{MAINT_CATEGORY_LABELS[t.category]}</TableCell>
                  <TableCell className="text-sm">{t.rooms?.room_number ?? t.location ?? "—"}</TableCell>
                  <TableCell>
                    <TonedBadge tone={PRIORITY_TONE[t.priority]}>
                      {MAINT_PRIORITY_LABELS[t.priority]}
                    </TonedBadge>
                  </TableCell>
                  <TableCell>
                    <TonedBadge tone={MAINT_STATUS_TONE[t.status]}>
                      {MAINT_STATUS_LABELS[t.status]}
                    </TonedBadge>
                  </TableCell>
                  <TableCell className="text-sm">{t.assignee?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">{t.cost ? formatCurrency(t.cost) : "—"}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <TicketFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        hotelId={hotel?.hotelId ?? null}
        ticket={editing}
        canManage={canManage}
        onQuickUpdate={(id, patch) => update.mutate({ id, patch })}
      />
    </div>
  );
}

function TicketFormDialog({
  open,
  onOpenChange,
  hotelId,
  ticket,
  canManage,
  onQuickUpdate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hotelId: string | null;
  ticket: Ticket | null;
  canManage: boolean;
  onQuickUpdate: (id: string, patch: Record<string, unknown>) => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [priority, setPriority] = useState<string>("normal");
  const [roomId, setRoomId] = useState<string>("");
  const [location, setLocation] = useState("");
  const [cost, setCost] = useState<string>("");
  const [status, setStatus] = useState<string>("open");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [resolution, setResolution] = useState<string>("");

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms-picklist"],
    queryFn: async () => {
      const { data } = await supabase.from("rooms").select("id,room_number").order("room_number");
      return (data ?? []) as { id: string; room_number: string }[];
    },
  });
  const { data: techs = [] } = useQuery({
    queryKey: ["maint-staff"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("profiles(id,full_name)")
        .in("role", ["maintenance_staff", "maintenance_manager"]);
      return (data ?? []).flatMap((r: Record<string, unknown>) => {
        const p = r.profiles as { id: string; full_name: string } | null;
        return p ? [p] : [];
      });
    },
  });

  // sync when editing
  useMemo(() => {
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description ?? "");
      setCategory(ticket.category);
      setPriority(ticket.priority);
      setRoomId(ticket.room_id ?? "");
      setLocation(ticket.location ?? "");
      setCost(String(ticket.cost ?? ""));
      setStatus(ticket.status);
      setAssignedTo(ticket.assigned_to ?? "");
      setResolution("");
    } else {
      setTitle(""); setDescription(""); setCategory("general"); setPriority("normal");
      setRoomId(""); setLocation(""); setCost(""); setStatus("open"); setAssignedTo("");
    }
  }, [ticket]);

  const save = useMutation({
    mutationFn: async () => {
      if (!hotelId) throw new Error("No active hotel");
      if (ticket) {
        const patch: Record<string, unknown> = {
          title, description, category, priority, status,
          room_id: roomId || null, location: location || null,
          cost: Number(cost) || 0,
          assigned_to: assignedTo || null,
        };
        if (status === "resolved" && !ticket.resolved_at) patch.resolved_at = new Date().toISOString();
        if (resolution) patch.resolution = resolution;
        const { error } = await supabase.from("maintenance_tickets").update(patch).eq("id", ticket.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("maintenance_tickets").insert({
          hotel_id: hotelId,
          title, description: description || null,
          category: category as "general",
          priority: priority as "normal",
          room_id: roomId || null,
          location: location || null,
          cost: Number(cost) || 0,
          reported_by: user?.id ?? null,
          assigned_to: assignedTo || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maint-tickets"] });
      toast.success(ticket ? "Ticket updated" : "Ticket created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ticket ? `Ticket ${ticket.reference}` : "New Maintenance Ticket"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AC not cooling in Room 204" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAINT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{MAINT_CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAINT_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{MAINT_PRIORITY_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Room (optional)</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Or Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lobby, Kitchen…" />
            </div>
            {(canManage || ticket) && (
              <>
                <div>
                  <Label>Assign To</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      {techs.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MAINT_STATUSES.map((s) => <SelectItem key={s} value={s}>{MAINT_STATUS_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <Label>Cost</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>
          {ticket && (
            <div>
              <Label>Resolution Notes</Label>
              <Textarea rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="What was done…" />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          {ticket && ticket.status === "open" && canManage && (
            <Button variant="outline" onClick={() => { onQuickUpdate(ticket.id, { status: "in_progress", started_at: new Date().toISOString() }); onOpenChange(false); }}>
              Start Work
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !title}>
            {ticket ? "Save" : "Create Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

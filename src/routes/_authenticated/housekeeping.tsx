import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Plus, Play, CheckCircle2, Eye, Timer, ClipboardCheck } from "lucide-react";
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
import { formatDate, formatDateTime } from "@/lib/format";
import {
  HK_PRIORITIES,
  HK_PRIORITY_LABELS,
  HK_STATUS_LABELS,
  HK_STATUS_TONE,
  HK_TASK_TYPES,
  HK_TASK_TYPE_LABELS,
  PRIORITY_TONE,
} from "@/lib/operations-constants";

export const Route = createFileRoute("/_authenticated/housekeeping")({
  component: HousekeepingPage,
});

type TaskRow = {
  id: string;
  hotel_id: string;
  room_id: string;
  status: string;
  priority: string;
  task_type: string;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  assigned_to: string | null;
  rooms: { room_number: string; status: string; cleaning_status: string } | null;
  assignee: { full_name: string } | null;
};

function HousekeepingPage() {
  const { user, hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["housekeeping_manager"]);
  const qc = useQueryClient();
  const { data: hotel } = useHotelRef();
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["hk-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("housekeeping_tasks")
        .select(
          "id,hotel_id,room_id,status,priority,task_type,scheduled_for,started_at,completed_at,notes,assigned_to,rooms(room_number,status,cleaning_status),assignee:profiles!housekeeping_tasks_assigned_to_fkey(full_name)",
        )
        .order("scheduled_for", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as TaskRow[];
    },
  });

  const filtered = useMemo(() => {
    let rows = tasks;
    if (tab === "mine") rows = rows.filter((t) => t.assigned_to === user?.id);
    if (statusFilter !== "all") rows = rows.filter((t) => t.status === statusFilter);
    return rows;
  }, [tasks, tab, statusFilter, user?.id]);

  const stats = useMemo(() => {
    const s = { total: tasks.length, pending: 0, in_progress: 0, completed: 0 };
    tasks.forEach((t) => {
      if (t.status === "pending") s.pending++;
      else if (t.status === "in_progress") s.in_progress++;
      else if (t.status === "completed") s.completed++;
    });
    return s;
  }, [tasks]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "in_progress") patch.started_at = new Date().toISOString();
      if (status === "completed") patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from("housekeeping_tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hk-tasks"] });
      toast.success("Task updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Housekeeping"
        description="Cleaning schedules, task assignment and inspections."
        icon={<Sparkles className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              filename={`housekeeping-${new Date().toISOString().slice(0, 10)}`}
              title="Housekeeping Tasks"
              subtitle="EGREED Hospitality Enterprise"
              rows={filtered}
              columns={[
                { header: "Room", value: (r) => r.rooms?.room_number ?? "" },
                { header: "Type", value: (r) => HK_TASK_TYPE_LABELS[r.task_type] ?? r.task_type },
                { header: "Priority", value: (r) => HK_PRIORITY_LABELS[r.priority] ?? r.priority },
                { header: "Status", value: (r) => HK_STATUS_LABELS[r.status] ?? r.status },
                { header: "Assignee", value: (r) => r.assignee?.full_name ?? "" },
                { header: "Scheduled", value: (r) => formatDate(r.scheduled_for) },
                { header: "Completed", value: (r) => (r.completed_at ? formatDateTime(r.completed_at) : "") },
              ]}
            />
            {canManage && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Task
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total Today" value={stats.total} icon={ClipboardCheck} />
          <StatCard label="Pending" value={stats.pending} icon={Timer} tone="warning" />
          <StatCard label="In Progress" value={stats.in_progress} icon={Play} tone="info" />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="success" />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="mine">Assigned to Me</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(HK_STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Sparkles} title="No housekeeping tasks" description="Create a task or assign rooms for cleaning." />
      ) : (
        <Card className="shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t, i) => (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.01, 0.2) }}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-semibold">{t.rooms?.room_number ?? "—"}</TableCell>
                  <TableCell>{HK_TASK_TYPE_LABELS[t.task_type] ?? t.task_type}</TableCell>
                  <TableCell>
                    <TonedBadge tone={PRIORITY_TONE[t.priority]}>
                      {HK_PRIORITY_LABELS[t.priority]}
                    </TonedBadge>
                  </TableCell>
                  <TableCell className="text-sm">{t.assignee?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatDate(t.scheduled_for)}</TableCell>
                  <TableCell>
                    <TonedBadge tone={HK_STATUS_TONE[t.status]}>
                      {HK_STATUS_LABELS[t.status]}
                    </TonedBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      {t.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: t.id, status: "in_progress" })}>
                          <Play className="mr-1 h-3.5 w-3.5" /> Start
                        </Button>
                      )}
                      {t.status === "in_progress" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: t.id, status: "waiting_inspection" })}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> Inspect
                        </Button>
                      )}
                      {(t.status === "waiting_inspection" || t.status === "in_progress") && canManage && (
                        <Button size="sm" onClick={() => updateStatus.mutate({ id: t.id, status: "completed" })}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <HkTaskFormDialog open={formOpen} onOpenChange={setFormOpen} hotelId={hotel?.hotelId ?? null} />
    </div>
  );
}

function HkTaskFormDialog({
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
  const [roomId, setRoomId] = useState<string>("");
  const [taskType, setTaskType] = useState<string>("standard");
  const [priority, setPriority] = useState<string>("normal");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [scheduledFor, setScheduledFor] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>("");

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms-picklist"],
    queryFn: async () => {
      const { data } = await supabase.from("rooms").select("id,room_number").order("room_number");
      return (data ?? []) as { id: string; room_number: string }[];
    },
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["hk-staff"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id,profiles(id,full_name)")
        .in("role", ["housekeeping_staff", "housekeeping_manager"]);
      return (data ?? []).flatMap((r: Record<string, unknown>) => {
        const p = r.profiles as { id: string; full_name: string } | null;
        return p ? [p] : [];
      });
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!hotelId) throw new Error("No active hotel");
      if (!roomId) throw new Error("Room is required");
      const { error } = await supabase.from("housekeeping_tasks").insert({
        hotel_id: hotelId,
        room_id: roomId,
        task_type: taskType,
        priority: priority as "low" | "normal" | "high" | "urgent",
        assigned_to: assigneeId || null,
        scheduled_for: scheduledFor,
        notes: notes || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hk-tasks"] });
      toast.success("Task created");
      onOpenChange(false);
      setRoomId(""); setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Housekeeping Task</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Room</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Task Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HK_TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{HK_TASK_TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{HK_PRIORITY_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled For</Label>
              <Input type="date" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Assign To</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Create Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ListTodo, Plus, CircleDot, PlayCircle, PauseCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useHotelRef } from "@/hooks/use-hotel";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  PRIORITY_TONE,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
} from "@/lib/operations-constants";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  hotel_id: string | null;
  assignee: { full_name: string } | null;
};

const COLUMNS = [
  { key: "todo", label: "To Do", icon: CircleDot, tone: "neutral" as const },
  { key: "in_progress", label: "In Progress", icon: PlayCircle, tone: "info" as const },
  { key: "blocked", label: "Blocked", icon: PauseCircle, tone: "warning" as const },
  { key: "done", label: "Done", icon: CheckCircle2, tone: "success" as const },
];

function TasksPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: hotel } = useHotelRef();
  const [view, setView] = useState<"board" | "mine">("board");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,description,status,priority,due_date,assigned_to,created_by,hotel_id,assignee:profiles!tasks_assigned_to_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Task[];
    },
  });

  const visible = useMemo(
    () => (view === "mine" ? tasks.filter((t) => t.assigned_to === user?.id) : tasks),
    [tasks, view, user?.id],
  );

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "done") patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from("tasks").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Cross-department to-do board with assignment and priority."
        icon={<ListTodo className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              filename={`tasks-${new Date().toISOString().slice(0, 10)}`}
              title="Task List"
              rows={visible}
              columns={[
                { header: "Title", value: (r) => r.title },
                { header: "Status", value: (r) => TASK_STATUS_LABELS[r.status] ?? r.status },
                { header: "Priority", value: (r) => TASK_PRIORITY_LABELS[r.priority] ?? r.priority },
                { header: "Assignee", value: (r) => r.assignee?.full_name ?? "" },
                { header: "Due", value: (r) => (r.due_date ? formatDate(r.due_date) : "") },
              ]}
            />
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> New Task
            </Button>
          </div>
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="board">All Tasks</TabsTrigger>
          <TabsTrigger value="mine">Assigned to Me</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <StatCardsSkeleton count={4} />
      ) : visible.length === 0 ? (
        <EmptyState icon={ListTodo} title="No tasks" description="Create a task to get started." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const colTasks = visible.filter((t) => t.status === col.key);
            return (
              <Card key={col.key} className="flex flex-col gap-3 p-3 shadow-card">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <col.icon className={cn(
                      "h-4 w-4",
                      col.tone === "success" && "text-success",
                      col.tone === "warning" && "text-warning",
                      col.tone === "info" && "text-info",
                    )} />
                    {col.label}
                  </div>
                  <span className="text-xs text-muted-foreground">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className="rounded-lg border bg-card p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => { setEditing(t); setFormOpen(true); }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{t.title}</p>
                        <TonedBadge tone={PRIORITY_TONE[t.priority]}>
                          {TASK_PRIORITY_LABELS[t.priority]}
                        </TonedBadge>
                      </div>
                      {t.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{t.assignee?.full_name ?? "Unassigned"}</span>
                        {t.due_date && <span>Due {formatDate(t.due_date)}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {TASK_STATUSES.filter((s) => s !== t.status && s !== "cancelled").map((s) => (
                          <button
                            key={s}
                            onClick={(e) => { e.stopPropagation(); move.mutate({ id: t.id, status: s }); }}
                            className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
                          >
                            → {TASK_STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        hotelId={hotel?.hotelId ?? null}
        task={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["tasks"] })}
      />
    </div>
  );
}

function TaskFormDialog({
  open,
  onOpenChange,
  hotelId,
  task,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hotelId: string | null;
  task: Task | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("normal");
  const [status, setStatus] = useState<string>("todo");
  const [dueDate, setDueDate] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");

  const { data: staff = [] } = useQuery({
    queryKey: ["all-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name").eq("is_active", true).order("full_name");
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });

  useMemo(() => {
    if (task) {
      setTitle(task.title); setDescription(task.description ?? "");
      setPriority(task.priority); setStatus(task.status);
      setDueDate(task.due_date ?? ""); setAssignedTo(task.assigned_to ?? "");
    } else {
      setTitle(""); setDescription(""); setPriority("normal");
      setStatus("todo"); setDueDate(""); setAssignedTo("");
    }
  }, [task]);

  const save = useMutation({
    mutationFn: async () => {
      if (task) {
        const patch: Record<string, unknown> = {
          title, description: description || null,
          priority: priority as "normal", status: status as "todo",
          due_date: dueDate || null, assigned_to: assignedTo || null,
        };
        if (status === "done") patch.completed_at = new Date().toISOString();
        const { error } = await supabase.from("tasks").update(patch as never).eq("id", task.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert({
          hotel_id: hotelId,
          title, description: description || null,
          priority: priority as "normal",
          status: status as "todo",
          due_date: dueDate || null,
          assigned_to: assignedTo || null,
          created_by: user?.id ?? null,
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
        <DialogHeader><DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !title}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

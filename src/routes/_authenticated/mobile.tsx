import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble, ChefHat, ListTodo, Sparkles, LayoutDashboard, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MANAGEMENT_ROLES, type AppRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mobile")({
  head: () => ({
    meta: [
      { title: "Staff Mobile — EGREED Hospitality" },
      { name: "description", content: "Phone-friendly staff app for rooms, kitchen orders and tasks." },
      { property: "og:title", content: "Staff Mobile — EGREED Hospitality" },
      { property: "og:description", content: "Phone-friendly staff app for rooms, kitchen orders and tasks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MobileApp,
});

type Tab = "rooms" | "cleaning" | "orders" | "tasks";
const M = MANAGEMENT_ROLES;
const TAB_ROLES: Record<Tab, AppRole[] | null> = {
  rooms: [...M, "receptionist", "housekeeping_manager", "housekeeping_staff"],
  cleaning: [...M, "receptionist", "housekeeping_manager", "housekeeping_staff"],
  orders: [...M, "restaurant_manager", "chef", "kitchen_staff", "waiter", "bar_staff", "cashier"],
  tasks: null,
};
const TABS: { key: Tab; label: string; icon: typeof BedDouble }[] = [
  { key: "rooms", label: "Rooms", icon: BedDouble },
  { key: "cleaning", label: "Cleaning", icon: Sparkles },
  { key: "orders", label: "Kitchen", icon: ChefHat },
  { key: "tasks", label: "Tasks", icon: ListTodo },
];

const label = (s: string) => s.replace(/_/g, " ");

function MobileApp() {
  const { roles, profile, signOut } = useAuth();
  const allowed = TABS.filter((t) => {
    const r = TAB_ROLES[t.key];
    return !r || roles.includes("super_admin") || r.some((x) => roles.includes(x));
  });
  const [tab, setTab] = useState<Tab | null>(null);
  const current = tab && allowed.some((t) => t.key === tab) ? tab : allowed[0]?.key ?? "tasks";

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{allowed.find((t) => t.key === current)?.label}</p>
          <p className="truncate text-xs text-muted-foreground">{profile?.full_name ?? "Staff"}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button asChild size="icon" variant="ghost" aria-label="Full workspace">
            <Link to="/dashboard"><LayoutDashboard className="h-5 w-5" /></Link>
          </Button>
          <Button size="icon" variant="ghost" aria-label="Sign out" onClick={() => signOut()}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-3 py-3">
        {current === "rooms" && <RoomsTab />}
        {current === "cleaning" && <CleaningTab />}
        {current === "orders" && <OrdersTab />}
        {current === "tasks" && <TasksTab />}
      </main>
      <nav className="grid border-t bg-card pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${allowed.length}, 1fr)` }}>
        {allowed.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-xs font-medium",
              current === t.key ? "text-primary" : "text-muted-foreground",
            )}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border bg-card p-3 shadow-sm">{children}</div>;
}
function Empty({ text }: { text: string }) {
  return <p className="py-12 text-center text-sm text-muted-foreground">{text}</p>;
}

const ROOM_FILTERS = ["all", "dirty", "occupied", "available", "reserved", "cleaning"] as const;

function RoomsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof ROOM_FILTERS)[number]>("all");
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["mobile-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, room_number, room_name, status").order("room_number");
      if (error) throw error;
      return data;
    },
  });
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("rooms").update({ status: status as never }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mobile-rooms"] }); qc.invalidateQueries({ queryKey: ["rooms"] }); toast.success("Room updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = data.filter((r) => (filter === "all" || r.status === filter) && r.room_number.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      <Input placeholder="Room number" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ROOM_FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="shrink-0 capitalize" onClick={() => setFilter(f)}>{f}</Button>
        ))}
      </div>
      {isLoading ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="No rooms" /> : (
        <div className="grid grid-cols-2 gap-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <p className="text-lg font-semibold">{r.room_number}</p>
              <Badge variant="secondary" className="mt-1 capitalize">{label(r.status)}</Badge>
              <div className="mt-2 flex flex-wrap gap-1">
                {r.status === "dirty" && <Button size="sm" className="h-8 flex-1" onClick={() => setStatus.mutate({ id: r.id, status: "cleaning" })}>Clean</Button>}
                {r.status === "cleaning" && <Button size="sm" className="h-8 flex-1" onClick={() => setStatus.mutate({ id: r.id, status: "available" })}>Ready</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CleaningTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["mobile-hk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("housekeeping_tasks")
        .select("id, task_type, status, priority, notes, room_id, rooms(room_number)")
        .in("status", ["pending", "in_progress", "waiting_inspection"])
        .order("scheduled_for");
      if (error) throw error;
      return data as unknown as { id: string; task_type: string; status: string; priority: string; notes: string | null; room_id: string; rooms: { room_number: string } | null }[];
    },
  });
  const advance = useMutation({
    mutationFn: async ({ id, roomId, status }: { id: string; roomId: string; status: string }) => {
      const now = new Date().toISOString();
      const patch: Record<string, unknown> = { status };
      if (status === "in_progress") patch.started_at = now;
      if (status === "completed") patch.completed_at = now;
      const { error } = await supabase.from("housekeeping_tasks").update(patch as never).eq("id", id);
      if (error) throw error;
      const roomStatus = status === "in_progress" ? "cleaning" : status === "completed" ? "available" : null;
      if (roomStatus) await supabase.from("rooms").update({ status: roomStatus as never }).eq("id", roomId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mobile-hk"] }); qc.invalidateQueries({ queryKey: ["mobile-rooms"] }); qc.invalidateQueries({ queryKey: ["housekeeping-tasks"] }); toast.success("Cleaning updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (isLoading) return <Empty text="Loading…" />;
  if (!data.length) return <Empty text="No open cleaning jobs" />;
  return (
    <div className="space-y-2">
      {data.map((t) => (
        <Card key={t.id}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <div className="min-w-0">
              <p className="font-semibold">Room {t.rooms?.room_number ?? "—"}</p>
              <p className="truncate text-sm capitalize text-muted-foreground">{label(t.task_type)}</p>
            </div>
            <Badge variant={t.priority === "high" || t.priority === "urgent" ? "destructive" : "secondary"} className="capitalize">{t.priority}</Badge>
          </div>
          {t.notes && <p className="mt-1 text-sm">{t.notes}</p>}
          <div className="mt-3">
            {t.status === "pending" && <Button className="h-11 w-full" onClick={() => advance.mutate({ id: t.id, roomId: t.room_id, status: "in_progress" })}>Start cleaning</Button>}
            {t.status === "in_progress" && <Button className="h-11 w-full" onClick={() => advance.mutate({ id: t.id, roomId: t.room_id, status: "completed" })}>Mark clean</Button>}
            {t.status === "waiting_inspection" && <Button variant="outline" className="h-11 w-full" onClick={() => advance.mutate({ id: t.id, roomId: t.room_id, status: "completed" })}>Pass inspection</Button>}
          </div>
        </Card>
      ))}
    </div>
  );
}

const NEXT_KITCHEN: Record<string, { to: string; text: string } | undefined> = {
  new: { to: "preparing", text: "Start preparing" },
  preparing: { to: "ready", text: "Mark ready" },
  ready: { to: "served", text: "Served" },
};

function OrdersTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["mobile-orders"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_orders")
        .select("id, order_number, kitchen_status, opened_at, special_requests, rooms(room_number), restaurant_tables(table_number), pos_order_items(id, name, quantity, voided)")
        .in("kitchen_status", ["new", "preparing", "ready"])
        .order("opened_at");
      if (error) throw error;
      return data as unknown as { id: string; order_number: string; kitchen_status: string; opened_at: string; special_requests: string | null; rooms: { room_number: string } | null; restaurant_tables: { table_number: string } | null; pos_order_items: { id: string; name: string; quantity: number; voided: boolean }[] }[];
    },
  });
  const advance = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("pos_orders").update({ kitchen_status: status as never }).eq("id", id);
      if (error) throw error;
      await supabase.from("pos_order_items").update({ kitchen_status: status as never }).eq("order_id", id).eq("voided", false);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mobile-orders"] }); qc.invalidateQueries({ queryKey: ["rms-orders"] }); toast.success("Order updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (isLoading) return <Empty text="Loading…" />;
  if (!data.length) return <Empty text="No open kitchen orders" />;
  return (
    <div className="space-y-2">
      {data.map((o) => {
        const mins = Math.round((Date.now() - new Date(o.opened_at).getTime()) / 60000);
        const next = NEXT_KITCHEN[o.kitchen_status];
        const where = o.rooms ? `Room ${o.rooms.room_number}` : o.restaurant_tables ? `Table ${o.restaurant_tables.table_number}` : "Takeaway";
        return (
          <Card key={o.id}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{o.order_number} · {where}</p>
                <p className={cn("text-xs", mins > 20 ? "text-destructive" : "text-muted-foreground")}>{mins} min ago</p>
              </div>
              <Badge variant="secondary" className="capitalize">{o.kitchen_status}</Badge>
            </div>
            <ul className="mt-2 space-y-0.5 text-sm">
              {o.pos_order_items.filter((i) => !i.voided).map((i) => <li key={i.id}>{i.quantity}× {i.name}</li>)}
            </ul>
            {o.special_requests && <p className="mt-1 text-sm text-muted-foreground">Note: {o.special_requests}</p>}
            {next && <Button className="mt-3 h-11 w-full" onClick={() => advance.mutate({ id: o.id, status: next.to })}>{next.text}</Button>}
          </Card>
        );
      })}
    </div>
  );
}

function TasksTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [mine, setMine] = useState(true);
  const { data = [], isLoading } = useQuery({
    queryKey: ["mobile-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, status, priority, due_date, assigned_to")
        .in("status", ["todo", "in_progress", "blocked"])
        .order("due_date", { nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
  const rows = useMemo(() => (mine ? data.filter((t) => t.assigned_to === user?.id) : data), [data, mine, user?.id]);
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "done") patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from("tasks").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mobile-tasks"] }); qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Task updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button variant={mine ? "default" : "outline"} onClick={() => setMine(true)}>My tasks</Button>
        <Button variant={!mine ? "default" : "outline"} onClick={() => setMine(false)}>All open</Button>
      </div>
      {isLoading ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="Nothing to do" /> : rows.map((t) => (
        <Card key={t.id}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <p className="min-w-0 font-semibold">{t.title}</p>
            <Badge variant="secondary" className="capitalize">{label(t.status)}</Badge>
          </div>
          {t.description && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{t.description}</p>}
          {t.due_date && <p className="mt-1 text-xs text-muted-foreground">Due {new Date(t.due_date).toLocaleDateString()}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {t.status !== "in_progress" && <Button variant="outline" className="h-11" onClick={() => setStatus.mutate({ id: t.id, status: "in_progress" })}>Start</Button>}
            <Button className={cn("h-11", t.status === "in_progress" && "col-span-2")} onClick={() => setStatus.mutate({ id: t.id, status: "done" })}>Done</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

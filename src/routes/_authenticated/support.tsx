import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Headphones,
  Plus,
  MessageSquare,
  AlarmClock,
  CheckCircle2,
  Send,
  Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useHotelRef } from "@/hooks/use-hotel";
import { AccessGuard } from "@/components/common/AccessGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { StatCardsSkeleton, TableSkeleton } from "@/components/common/LoadingState";
import { TonedBadge } from "@/components/common/TonedBadge";
import { ExportMenu } from "@/components/common/ExportMenu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { formatDateTime, timeAgo } from "@/lib/format";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_CHANNELS,
  SUPPORT_CHANNEL_LABELS,
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_PRIORITY_TONE,
  SUPPORT_SLA_HOURS,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_TONE,
} from "@/lib/enterprise-constants";
import { MANAGEMENT_ROLES } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: "Customer Support — EGREED Hospitality" },
      {
        name: "description",
        content:
          "Guest request desk: log tickets, track SLA breaches, reply to guests and resolve service recovery cases.",
      },
      { property: "og:title", content: "Customer Support — EGREED Hospitality" },
      {
        property: "og:description",
        content: "Guest tickets, SLA tracking and service recovery in one desk.",
      },
    ],
  }),
  component: SupportPage,
});

interface Ticket {
  id: string;
  reference: string;
  subject: string;
  description: string | null;
  category: string;
  channel: string;
  priority: string;
  status: string;
  guest_name: string | null;
  guest_contact: string | null;
  room_id: string | null;
  resolution: string | null;
  satisfaction: number | null;
  created_at: string;
  resolved_at: string | null;
}

interface TicketMessage {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

const EMPTY = {
  subject: "",
  description: "",
  category: "general",
  channel: "front_desk",
  priority: "normal",
  status: "open",
  guest_name: "",
  guest_contact: "",
  room_id: "",
};

function slaBreached(t: Ticket) {
  if (t.status === "resolved" || t.status === "closed") return false;
  const hours = SUPPORT_SLA_HOURS[t.priority] ?? 12;
  return Date.now() - new Date(t.created_at).getTime() > hours * 3600_000;
}

function SupportPage() {
  const qc = useQueryClient();
  const { hasAnyRole, user } = useAuth();
  const { data: hotel } = useHotelRef();

  const canView = hasAnyRole([...MANAGEMENT_ROLES, "customer_support", "receptionist"]);
  const canManage = hasAnyRole([...MANAGEMENT_ROLES, "customer_support"]);

  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [active, setActive] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms-lite"],
    queryFn: async () => {
      const { data } = await supabase.from("rooms").select("id,room_number").order("room_number");
      return (data ?? []) as { id: string; room_number: string }[];
    },
    enabled: canView,
  });
  const roomLabel = (id: string | null) =>
    rooms.find((r) => r.id === id)?.room_number ?? "—";

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(
          "id,reference,subject,description,category,channel,priority,status,guest_name,guest_contact,room_id,resolution,satisfaction,created_at,resolved_at",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as Ticket[];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["support-messages", active?.id],
    enabled: !!active,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("id,body,is_internal,created_at")
        .eq("ticket_id", active!.id)
        .order("created_at");
      if (error) throw error;
      return data as unknown as TicketMessage[];
    },
  });

  const saveTicket = useMutation({
    mutationFn: async () => {
      if (!form.subject.trim()) throw new Error("Subject is required");
      const payload = {
        hotel_id: hotel?.hotelId ?? null,
        subject: form.subject.trim(),
        description: form.description || null,
        category: form.category,
        channel: form.channel,
        priority: form.priority as "low" | "normal" | "high" | "urgent",
        status: form.status as Ticket["status"],
        guest_name: form.guest_name || null,
        guest_contact: form.guest_contact || null,
        room_id: form.room_id || null,
        created_by: user?.id ?? null,
      };
      const { error } = await supabase.from("support_tickets").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket logged");
      setFormOpen(false);
      setForm({ ...EMPTY });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("support_tickets").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      setActive((prev) => (prev && prev.id === v.id ? { ...prev, ...(v.patch as object) } as Ticket : prev));
      toast.success("Ticket updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMessage = useMutation({
    mutationFn: async () => {
      if (!reply.trim() || !active) throw new Error("Message is empty");
      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: active.id,
        body: reply.trim(),
        is_internal: internal,
        author_id: user?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["support-messages", active?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let rows = tickets;
    if (status !== "all") rows = rows.filter((t) => t.status === status);
    if (priority !== "all") rows = rows.filter((t) => t.priority === priority);
    if (q.trim()) {
      const term = q.toLowerCase();
      rows = rows.filter((t) =>
        [t.reference, t.subject, t.guest_name, t.description].some((v) =>
          v?.toLowerCase().includes(term),
        ),
      );
    }
    return rows;
  }, [tickets, status, priority, q]);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
    const breached = tickets.filter(slaBreached).length;
    const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed");
    const durations = resolved
      .filter((t) => t.resolved_at)
      .map((t) => new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime());
    const avgHours = durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length / 3600_000
      : 0;
    const rated = tickets.filter((t) => t.satisfaction);
    const csat = rated.length
      ? rated.reduce((a, t) => a + (t.satisfaction ?? 0), 0) / rated.length
      : 0;
    return { open, breached, resolved: resolved.length, avgHours, csat };
  }, [tickets]);

  return (
    <AccessGuard allowed={canView} feature="Customer Support">
      <div className="space-y-6">
        <PageHeader
          title="Customer Support"
          description="Guest requests, complaints and service recovery with SLA tracking."
          icon={<Headphones className="h-5 w-5" />}
          actions={
            <div className="flex items-center gap-2">
              <ExportMenu
                filename={`support-tickets-${new Date().toISOString().slice(0, 10)}`}
                title="Support Ticket Register"
                rows={filtered}
                columns={[
                  { header: "Ref", value: (r) => r.reference },
                  { header: "Subject", value: (r) => r.subject },
                  { header: "Guest", value: (r) => r.guest_name ?? "" },
                  { header: "Room", value: (r) => roomLabel(r.room_id) },
                  { header: "Category", value: (r) => SUPPORT_CATEGORY_LABELS[r.category] ?? r.category },
                  { header: "Priority", value: (r) => SUPPORT_PRIORITY_LABELS[r.priority] ?? r.priority },
                  { header: "Status", value: (r) => SUPPORT_STATUS_LABELS[r.status] ?? r.status },
                  { header: "Logged", value: (r) => formatDateTime(r.created_at) },
                ]}
              />
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Ticket
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <StatCardsSkeleton count={4} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Open tickets" value={stats.open} icon={MessageSquare} accent="info" index={0} />
            <StatCard
              label="SLA breached"
              value={stats.breached}
              icon={AlarmClock}
              accent="destructive"
              hint="Past target response window"
              index={1}
            />
            <StatCard
              label="Avg resolution"
              value={`${stats.avgHours.toFixed(1)} h`}
              icon={Timer}
              accent="primary"
              index={2}
            />
            <StatCard
              label="Resolved"
              value={stats.resolved}
              icon={CheckCircle2}
              accent="success"
              hint={stats.csat ? `CSAT ${stats.csat.toFixed(1)}/5` : "No ratings yet"}
              index={3}
            />
          </div>
        )}

        <Card className="shadow-card">
          <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center">
            <Input
              placeholder="Search reference, subject or guest…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {SUPPORT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{SUPPORT_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {SUPPORT_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{SUPPORT_PRIORITY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="p-6"><TableSkeleton /></div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Headphones}
                title="No tickets found"
                description="Log a guest request to start tracking response and resolution times."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Guest / Room</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Logged</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => setActive(t)}
                  >
                    <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                    <TableCell>
                      <p className="font-medium">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {SUPPORT_CATEGORY_LABELS[t.category] ?? t.category} ·{" "}
                        {SUPPORT_CHANNEL_LABELS[t.channel] ?? t.channel}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.guest_name || "—"}
                      <span className="block text-xs text-muted-foreground">
                        Room {roomLabel(t.room_id)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TonedBadge tone={SUPPORT_PRIORITY_TONE[t.priority]}>
                          {SUPPORT_PRIORITY_LABELS[t.priority]}
                        </TonedBadge>
                        {slaBreached(t) && <TonedBadge tone="destructive">SLA</TonedBadge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TonedBadge tone={SUPPORT_STATUS_TONE[t.status]}>
                        {SUPPORT_STATUS_LABELS[t.status]}
                      </TonedBadge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeAgo(t.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* New ticket */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Log support ticket</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{SUPPORT_CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORT_CHANNELS.map((c) => (
                      <SelectItem key={c} value={c}>{SUPPORT_CHANNEL_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORT_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{SUPPORT_PRIORITY_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Room</Label>
                <Select value={form.room_id || "none"} onValueChange={(v) => setForm({ ...form, room_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="No room" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No room</SelectItem>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Guest name</Label>
                <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
              </div>
              <div>
                <Label>Contact</Label>
                <Input value={form.guest_contact} onChange={(e) => setForm({ ...form, guest_contact: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={() => saveTicket.mutate()} disabled={saveTicket.isPending}>
                Log ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail + conversation */}
        <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
            {active && (
              <>
                <SheetHeader>
                  <SheetTitle>{active.subject}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-5 px-4 pb-8 sm:px-0">
                  <div className="flex flex-wrap gap-2">
                    <TonedBadge tone="neutral">{active.reference}</TonedBadge>
                    <TonedBadge tone={SUPPORT_PRIORITY_TONE[active.priority]}>
                      {SUPPORT_PRIORITY_LABELS[active.priority]}
                    </TonedBadge>
                    <TonedBadge tone={SUPPORT_STATUS_TONE[active.status]}>
                      {SUPPORT_STATUS_LABELS[active.status]}
                    </TonedBadge>
                  </div>
                  {active.description && (
                    <p className="text-sm text-muted-foreground">{active.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Guest:</span> {active.guest_name || "—"}</div>
                    <div><span className="text-muted-foreground">Contact:</span> {active.guest_contact || "—"}</div>
                    <div><span className="text-muted-foreground">Room:</span> {roomLabel(active.room_id)}</div>
                    <div><span className="text-muted-foreground">Logged:</span> {formatDateTime(active.created_at)}</div>
                  </div>

                  {canManage && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={active.status}
                          onValueChange={(v) =>
                            updateTicket.mutate({
                              id: active.id,
                              patch: {
                                status: v,
                                resolved_at:
                                  v === "resolved" || v === "closed" ? new Date().toISOString() : null,
                              },
                            })
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SUPPORT_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{SUPPORT_STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select
                          value={active.priority}
                          onValueChange={(v) => updateTicket.mutate({ id: active.id, patch: { priority: v } })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SUPPORT_PRIORITIES.map((p) => (
                              <SelectItem key={p} value={p}>{SUPPORT_PRIORITY_LABELS[p]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Guest satisfaction (1–5)</Label>
                        <Select
                          value={active.satisfaction ? String(active.satisfaction) : "none"}
                          onValueChange={(v) =>
                            updateTicket.mutate({
                              id: active.id,
                              patch: { satisfaction: v === "none" ? null : Number(v) },
                            })
                          }
                        >
                          <SelectTrigger><SelectValue placeholder="Not rated" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not rated</SelectItem>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Conversation</p>
                    {messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No replies yet.</p>
                    ) : (
                      messages.map((m) => (
                        <div
                          key={m.id}
                          className={`rounded-lg border border-border/60 p-3 text-sm ${
                            m.is_internal ? "bg-muted/50" : "bg-card"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <TonedBadge tone={m.is_internal ? "warning" : "info"}>
                              {m.is_internal ? "Internal note" : "Guest reply"}
                            </TonedBadge>
                            {formatDateTime(m.created_at)}
                          </div>
                          {m.body}
                        </div>
                      ))
                    )}
                    <Textarea
                      rows={3}
                      placeholder="Write a reply or internal note…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Switch checked={internal} onCheckedChange={setInternal} /> Internal note
                      </label>
                      <Button size="sm" onClick={() => addMessage.mutate()} disabled={addMessage.isPending}>
                        <Send className="mr-2 h-4 w-4" /> Send
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AccessGuard>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PartyPopper, Plus, Users, CalendarDays, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { formatCurrency, formatDate } from "@/lib/format";
import {
  BANQUET_EVENT_TYPES,
  BANQUET_STATUSES,
  BANQUET_STATUS_LABELS,
  BANQUET_STATUS_TONE,
} from "@/lib/restaurant-constants";
import { useOutlets, useRmsAccess } from "@/hooks/use-restaurant";

export const Route = createFileRoute("/_authenticated/restaurant/banquets")({
  head: () => ({
    meta: [
      { title: "Banquets & Events — EGREED Hospitality Enterprise" },
      {
        name: "description",
        content:
          "Plan conferences, weddings and corporate catering: packages, covers, menus and event revenue tracking.",
      },
      { property: "og:title", content: "Banquets & Events — EGREED Hospitality" },
      {
        property: "og:description",
        content: "Event packages, covers, menus and catering revenue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BanquetsPage,
});

interface BanquetEvent {
  id: string;
  name: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  guest_count: number;
  package_name: string | null;
  package_price: number;
  total_amount: number;
  status: string;
  special_requests: string | null;
  menu_notes: string | null;
}

function useBanquets() {
  return useQuery({
    queryKey: ["rms-banquets"],
    queryFn: async (): Promise<BanquetEvent[]> => {
      const { data, error } = await supabase
        .from("banquet_events")
        .select("*")
        .order("event_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as BanquetEvent[];
    },
  });
}

function BanquetsPage() {
  const { outlet, outletId } = useOutlets();
  const { isManager } = useRmsAccess();
  const { data: events = [], isLoading } = useBanquets();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("all");

  const currency = outlet?.currency ?? "RWF";
  const filtered = useMemo(
    () => events.filter((e) => status === "all" || e.status === status),
    [events, status],
  );

  const stats = useMemo(() => {
    const upcoming = events.filter(
      (e) => new Date(e.event_date) >= new Date(new Date().toDateString()),
    );
    const confirmed = events.filter((e) => e.status === "confirmed");
    const revenue = events
      .filter((e) => ["confirmed", "in_progress", "completed"].includes(e.status))
      .reduce((s, e) => s + Number(e.total_amount), 0);
    const covers = upcoming.reduce((s, e) => s + e.guest_count, 0);
    return { upcoming: upcoming.length, confirmed: confirmed.length, revenue, covers };
  }, [events]);

  const setEventStatus = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: string }) => {
      const { error } = await supabase
        .from("banquet_events")
        .update({ status: next as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rms-banquets"] });
      toast.success("Event updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banquets & Events"
        description="Conferences, weddings and corporate catering from inquiry to invoice."
        icon={<PartyPopper className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              filename="banquet-events"
              title="Banquet Events"
              columns={[
                { header: "Event", value: (e: BanquetEvent) => e.name },
                { header: "Type", value: (e: BanquetEvent) => e.event_type },
                { header: "Date", value: (e: BanquetEvent) => e.event_date },
                { header: "Guests", value: (e: BanquetEvent) => e.guest_count, align: "right" },
                { header: "Package", value: (e: BanquetEvent) => e.package_name ?? "—" },
                { header: "Total", value: (e: BanquetEvent) => Number(e.total_amount), align: "right" },
                { header: "Status", value: (e: BanquetEvent) => BANQUET_STATUS_LABELS[e.status] ?? e.status },
              ]}
              rows={filtered}
            />
            {isManager && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" /> Event
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Upcoming events" value={stats.upcoming} icon={CalendarDays} accent="primary" index={0} />
        <StatCard label="Confirmed" value={stats.confirmed} icon={PartyPopper} accent="success" index={1} />
        <StatCard label="Covers booked" value={stats.covers} icon={Users} accent="info" index={2} />
        <StatCard
          label="Contracted revenue"
          value={formatCurrency(stats.revenue, currency)}
          icon={CalendarDays}
          accent="success"
          index={3}
        />
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {BANQUET_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {BANQUET_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="No events"
          description="Log an inquiry to start planning conferences and celebrations."
          action={
            isManager ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" /> New event
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((e) => (
            <Card key={e.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {e.event_type} · {formatDate(e.event_date)}
                    {e.start_time ? ` · ${e.start_time.slice(0, 5)}` : ""}
                  </p>
                </div>
                <TonedBadge tone={BANQUET_STATUS_TONE[e.status]}>
                  {BANQUET_STATUS_LABELS[e.status]}
                </TonedBadge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Guests</p>
                  <p className="font-semibold">{e.guest_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Package</p>
                  <p className="font-semibold">{e.package_name ?? "Custom"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold">{formatCurrency(e.total_amount, currency)}</p>
                </div>
              </div>

              {e.special_requests && (
                <p className="rounded-md bg-muted/60 px-2 py-1 text-xs">{e.special_requests}</p>
              )}

              {isManager && (
                <div className="border-t pt-3">
                  <Select
                    value={e.status}
                    onValueChange={(v) => setEventStatus.mutate({ id: e.id, next: v })}
                  >
                    <SelectTrigger className="h-8 w-[200px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BANQUET_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {BANQUET_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <EventDialog
        open={creating}
        onOpenChange={setCreating}
        hotelId={outlet?.hotel_id ?? null}
        outletId={outletId}
      />
    </div>
  );
}

function EventDialog({
  open,
  onOpenChange,
  hotelId,
  outletId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  hotelId: string | null;
  outletId: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    event_type: "conference",
    event_date: new Date().toISOString().slice(0, 10),
    start_time: "09:00",
    end_time: "17:00",
    guest_count: "50",
    package_name: "",
    package_price: "",
    special_requests: "",
  });

  const total = (Number(form.package_price) || 0) * (Number(form.guest_count) || 0);

  const create = useMutation({
    mutationFn: async () => {
      if (!hotelId) throw new Error("No hotel context");
      const { error } = await supabase.from("banquet_events").insert({
        hotel_id: hotelId,
        outlet_id: outletId,
        name: form.name.trim(),
        event_type: form.event_type,
        event_date: form.event_date,
        start_time: form.start_time,
        end_time: form.end_time,
        guest_count: Number(form.guest_count) || 0,
        package_name: form.package_name.trim() || null,
        package_price: Number(form.package_price) || 0,
        total_amount: total,
        special_requests: form.special_requests.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rms-banquets"] });
      toast.success("Event created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ename">Event name</Label>
            <Input
              id="ename"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={form.event_type}
              onValueChange={(v) => setForm({ ...form, event_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BANQUET_EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edate">Date</Label>
            <Input
              id="edate"
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estart">Start</Label>
            <Input
              id="estart"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eend">End</Label>
            <Input
              id="eend"
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eguests">Guests</Label>
            <Input
              id="eguests"
              type="number"
              value={form.guest_count}
              onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eprice">Package price / guest</Label>
            <Input
              id="eprice"
              type="number"
              value={form.package_price}
              onChange={(e) => setForm({ ...form, package_price: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="epkg">Package name</Label>
            <Input
              id="epkg"
              value={form.package_name}
              onChange={(e) => setForm({ ...form, package_name: e.target.value })}
              placeholder="Gold buffet"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ereq">Special requests</Label>
            <Textarea
              id="ereq"
              rows={2}
              value={form.special_requests}
              onChange={(e) => setForm({ ...form, special_requests: e.target.value })}
            />
          </div>
          <p className="text-sm sm:col-span-2">
            Estimated total: <span className="font-semibold">{formatCurrency(total)}</span>
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={!form.name.trim() || create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

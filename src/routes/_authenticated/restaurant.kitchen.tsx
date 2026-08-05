import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChefHat, Flame, CheckCircle2, Timer, Utensils } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TonedBadge } from "@/components/common/TonedBadge";
import { StatCard } from "@/components/common/StatCard";
import { OutletSwitcher } from "@/components/restaurant/OutletSwitcher";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  KITCHEN_STATUS_LABELS,
  KITCHEN_STATUS_TONE,
  ORDER_PRIORITY_LABELS,
  ORDER_PRIORITY_TONE,
  ORDER_TYPE_LABELS,
  minutesSince,
} from "@/lib/restaurant-constants";
import { useOrders, useOutlets, useRmsAccess, type PosOrder } from "@/hooks/use-restaurant";

export const Route = createFileRoute("/_authenticated/restaurant/kitchen")({
  head: () => ({
    meta: [
      { title: "Kitchen Display System — EGREED Hospitality Enterprise" },
      {
        name: "description",
        content:
          "Live kitchen display: incoming tickets, preparation timers, course firing and ready-to-serve tracking.",
      },
      { property: "og:title", content: "Kitchen Display — EGREED Hospitality" },
      {
        property: "og:description",
        content: "Live kitchen tickets, prep timers and ready-to-serve tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KitchenPage,
});

const COLUMNS: { key: string; label: string; next?: string; cta?: string }[] = [
  { key: "new", label: "New Tickets", next: "preparing", cta: "Start cooking" },
  { key: "preparing", label: "Preparing", next: "ready", cta: "Mark ready" },
  { key: "ready", label: "Ready to Serve", next: "served", cta: "Mark served" },
];

function KitchenPage() {
  const { outletId, select } = useOutlets();
  const { canCook } = useRmsAccess();
  const qc = useQueryClient();
  const [showServed, setShowServed] = useState(false);

  const { data: orders = [], isLoading } = useOrders({
    outletId,
    statuses: ["open", "sent", "partially_paid", "paid"],
    kitchen: true,
    refetchInterval: 15000,
  });

  const live = useMemo(
    () =>
      orders.filter((o) =>
        showServed
          ? true
          : ["new", "preparing", "ready"].includes(o.kitchen_status),
      ),
    [orders, showServed],
  );

  const stats = useMemo(() => {
    const active = orders.filter((o) => ["new", "preparing"].includes(o.kitchen_status));
    const ready = orders.filter((o) => o.kitchen_status === "ready");
    const late = active.filter((o) => minutesSince(o.opened_at) > 20);
    const avg = active.length
      ? Math.round(active.reduce((s, o) => s + minutesSince(o.opened_at), 0) / active.length)
      : 0;
    return { active: active.length, ready: ready.length, late: late.length, avg };
  }, [orders]);

  const advance = useMutation({
    mutationFn: async ({ order, status }: { order: PosOrder; status: string }) => {
      const stamp =
        status === "preparing"
          ? { started_at: new Date().toISOString() }
          : status === "ready"
            ? { ready_at: new Date().toISOString() }
            : {};
      const { error } = await supabase
        .from("pos_orders")
        .update({ kitchen_status: status as never })
        .eq("id", order.id);
      if (error) throw error;
      const { error: lineError } = await supabase
        .from("pos_order_items")
        .update({ kitchen_status: status as never, ...stamp })
        .eq("order_id", order.id)
        .eq("voided", false);
      if (lineError) throw lineError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rms-orders"] });
      toast.success("Ticket updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kitchen Display"
        description="Live tickets from every till, colour-coded by wait time."
        icon={<ChefHat className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowServed((s) => !s)}>
              {showServed ? "Hide served" : "Show served"}
            </Button>
            <OutletSwitcher value={outletId} onChange={select} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active tickets" value={stats.active} icon={Flame} accent="warning" index={0} />
        <StatCard label="Ready to serve" value={stats.ready} icon={CheckCircle2} accent="success" index={1} />
        <StatCard label="Overdue (>20m)" value={stats.late} icon={Timer} accent="destructive" index={2} />
        <StatCard label="Avg wait" value={`${stats.avg}m`} icon={Utensils} accent="info" index={3} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : live.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="No live tickets"
          description="Orders sent from the POS appear here instantly."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const tickets = live.filter((o) => o.kitchen_status === col.key);
            return (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">{col.label}</h2>
                  <TonedBadge tone={KITCHEN_STATUS_TONE[col.key]}>{tickets.length}</TonedBadge>
                </div>
                {tickets.length === 0 ? (
                  <Card className="border-dashed p-6 text-center text-xs text-muted-foreground">
                    Nothing here
                  </Card>
                ) : (
                  tickets.map((o) => (
                    <TicketCard
                      key={o.id}
                      order={o}
                      cta={col.cta}
                      disabled={!canCook || advance.isPending}
                      onAdvance={() =>
                        col.next && advance.mutate({ order: o, status: col.next })
                      }
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TicketCard({
  order,
  cta,
  disabled,
  onAdvance,
}: {
  order: PosOrder;
  cta?: string;
  disabled?: boolean;
  onAdvance: () => void;
}) {
  const mins = minutesSince(order.opened_at);
  const tone = mins > 20 ? "destructive" : mins > 10 ? "warning" : "info";
  const lines = (order.pos_order_items ?? []).filter((l) => !l.voided);

  return (
    <Card
      className={cn(
        "space-y-3 p-4",
        mins > 20 && "border-destructive/50",
        mins > 10 && mins <= 20 && "border-warning/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{order.order_number}</p>
          <p className="text-xs text-muted-foreground">
            {ORDER_TYPE_LABELS[order.type]}
            {order.restaurant_tables?.name ? ` · ${order.restaurant_tables.name}` : ""}
            {order.rooms?.room_number ? ` · Room ${order.rooms.room_number}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TonedBadge tone={tone}>{mins}m</TonedBadge>
          {order.priority !== "normal" && (
            <TonedBadge tone={ORDER_PRIORITY_TONE[order.priority]}>
              {ORDER_PRIORITY_LABELS[order.priority]}
            </TonedBadge>
          )}
        </div>
      </div>

      <ul className="space-y-1 text-sm">
        {lines.map((l) => (
          <li key={l.id} className="flex gap-2">
            <span className="font-semibold text-primary">{l.quantity}×</span>
            <span className="flex-1">
              {l.name}
              {l.modifiers?.length ? (
                <span className="block text-xs text-muted-foreground">
                  {l.modifiers.join(", ")}
                </span>
              ) : null}
              {l.notes ? (
                <span className="block text-xs italic text-warning">{l.notes}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {order.special_requests && (
        <p className="rounded-md bg-muted/60 px-2 py-1 text-xs">{order.special_requests}</p>
      )}

      <div className="flex items-center justify-between">
        <TonedBadge tone={KITCHEN_STATUS_TONE[order.kitchen_status]}>
          {KITCHEN_STATUS_LABELS[order.kitchen_status]}
        </TonedBadge>
        {cta && (
          <Button size="sm" disabled={disabled} onClick={onAdvance}>
            {cta}
          </Button>
        )}
      </div>
    </Card>
  );
}

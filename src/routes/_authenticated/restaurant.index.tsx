import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  UtensilsCrossed,
  Receipt,
  Timer,
  TrendingUp,
  ChefHat,
  Table2,
  BookOpen,
  Boxes,
} from "lucide-react";
import { RmsGuard } from "@/components/restaurant/RmsGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatCardsSkeleton } from "@/components/common/LoadingState";
import { TonedBadge } from "@/components/common/TonedBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { OutletSwitcher } from "@/components/restaurant/OutletSwitcher";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOutlets, useOrders, useRmsAccess } from "@/hooks/use-restaurant";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  ORDER_TYPE_LABELS,
  minutesSince,
} from "@/lib/restaurant-constants";

export const Route = createFileRoute("/_authenticated/restaurant/")({
  head: () => ({
    meta: [
      { title: "Restaurant & POS — EGREED Hospitality Enterprise" },
      {
        name: "description",
        content:
          "Multi-outlet restaurant, bar and room-service operations: live sales, open tickets and kitchen performance.",
      },
      { property: "og:title", content: "Restaurant & POS — EGREED Hospitality" },
      {
        property: "og:description",
        content: "Live restaurant sales, open tickets and kitchen performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RestaurantOverview,
});

function RestaurantOverview() {
  const rmsAccess = useRmsAccess();
  const { outlet, outletId, select } = useOutlets();
  const { data: orders = [], isLoading } = useOrders({ outletId, refetchInterval: 30000 });

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todays = orders.filter((o) => new Date(o.opened_at).toDateString() === today);
    const revenue = todays
      .filter((o) => o.status === "paid" || o.status === "partially_paid")
      .reduce((s, o) => s + Number(o.paid_amount), 0);
    const open = orders.filter((o) => ["open", "sent", "partially_paid"].includes(o.status));
    const covers = todays.reduce((s, o) => s + o.covers, 0);
    const avg = todays.length ? revenue / todays.length : 0;
    return { revenue, open: open.length, covers, avg, count: todays.length };
  }, [orders]);

  const recent = orders.slice(0, 8);

  return (
    <RmsGuard allowed={rmsAccess.canViewRestaurant} feature="the Restaurant module">
    <div className="space-y-6">
      <PageHeader
        title="Restaurant & POS"
        description="Multi-outlet food and beverage operations, live from the floor."
        icon={<UtensilsCrossed className="h-5 w-5" />}
        actions={<OutletSwitcher value={outletId} onChange={select} />}
      />

      {isLoading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Today's revenue"
            value={formatCurrency(stats.revenue, outlet?.currency ?? "RWF")}
            icon={TrendingUp}
            accent="success"
            hint={`${stats.count} orders`}
            index={0}
          />
          <StatCard label="Open tickets" value={stats.open} icon={Receipt} accent="warning" index={1} />
          <StatCard label="Covers served" value={stats.covers} icon={UtensilsCrossed} accent="primary" index={2} />
          <StatCard
            label="Average check"
            value={formatCurrency(stats.avg, outlet?.currency ?? "RWF")}
            icon={Timer}
            accent="info"
            index={3}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/restaurant/pos" icon={UtensilsCrossed} label="Open POS" hint="Take an order" />
        <QuickLink to="/restaurant/kitchen" icon={ChefHat} label="Kitchen Display" hint="Live tickets" />
        <QuickLink to="/restaurant/tables" icon={Table2} label="Floor Plan" hint="Table status" />
        <QuickLink to="/restaurant/menu" icon={BookOpen} label="Menu Manager" hint="Items & pricing" />
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Recent orders</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/restaurant/reports">
              <Boxes className="mr-2 h-4 w-4" /> Reports
            </Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            className="border-0 bg-transparent"
            icon={Receipt}
            title="No orders yet"
            description="Orders taken at the POS appear here in real time."
          />
        ) : (
          <ul className="divide-y">
            {recent.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="font-medium">{o.order_number}</span>
                <TonedBadge tone={ORDER_STATUS_TONE[o.status]}>
                  {ORDER_STATUS_LABELS[o.status]}
                </TonedBadge>
                <span className="text-muted-foreground">
                  {ORDER_TYPE_LABELS[o.type]}
                  {o.restaurant_tables?.name ? ` · ${o.restaurant_tables.name}` : ""}
                  {o.rooms?.room_number ? ` · Room ${o.rooms.room_number}` : ""}
                </span>
                <span className="ml-auto text-muted-foreground">
                  {formatDateTime(o.opened_at)} · {minutesSince(o.opened_at)}m
                </span>
                <span className="w-28 text-right font-semibold">
                  {formatCurrency(o.total, outlet?.currency ?? "RWF")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
    </RmsGuard>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
  hint,
}: {
  to: string;
  icon: typeof Receipt;
  label: string;
  hint: string;
}) {
  return (
    <Link to={to} className="group">
      <Card className="flex items-center gap-3 p-4 transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </Card>
    </Link>
  );
}

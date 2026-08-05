import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Receipt,
  Percent,
  Utensils,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { StatCardsSkeleton } from "@/components/common/LoadingState";
import { ExportMenu } from "@/components/common/ExportMenu";
import { OutletSwitcher } from "@/components/restaurant/OutletSwitcher";
import { Card } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/format";
import { ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/restaurant-constants";
import { useOrders, useOutlets } from "@/hooks/use-restaurant";

export const Route = createFileRoute("/_authenticated/restaurant/reports")({
  head: () => ({
    meta: [
      { title: "Restaurant Reports — EGREED Hospitality Enterprise" },
      {
        name: "description",
        content:
          "Food & beverage analytics: daily sales, best-selling items, order mix, gross margin and average check performance.",
      },
      { property: "og:title", content: "Restaurant Reports — EGREED Hospitality" },
      {
        property: "og:description",
        content: "Daily sales, best sellers, order mix and margin analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

interface SellerRow {
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
}

function ReportsPage() {
  const { outlet, outletId, select } = useOutlets();
  const [range, setRange] = useState("30");
  const { data: orders = [], isLoading } = useOrders({ outletId });

  const currency = outlet?.currency ?? "RWF";

  const scoped = useMemo(() => {
    const from = Date.now() - Number(range) * 86400000;
    return orders.filter(
      (o) => new Date(o.opened_at).getTime() >= from && o.status !== "void",
    );
  }, [orders, range]);

  const stats = useMemo(() => {
    const revenue = scoped.reduce((s, o) => s + Number(o.total), 0);
    const covers = scoped.reduce((s, o) => s + o.covers, 0);
    const lines = scoped.flatMap((o) => (o.pos_order_items ?? []).filter((l) => !l.voided));
    const cost = lines.reduce((s, l) => s + Number(l.cost_price) * l.quantity, 0);
    const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
    return {
      revenue,
      orders: scoped.length,
      avg: scoped.length ? revenue / scoped.length : 0,
      covers,
      margin,
    };
  }, [scoped]);

  const daily = useMemo(() => {
    const map = new Map<string, number>();
    scoped.forEach((o) => {
      const key = new Date(o.opened_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
      map.set(key, (map.get(key) ?? 0) + Number(o.total));
    });
    return Array.from(map, ([day, total]) => ({ day, total })).reverse();
  }, [scoped]);

  const mix = useMemo(() => {
    const map = new Map<string, number>();
    scoped.forEach((o) => map.set(o.type, (map.get(o.type) ?? 0) + Number(o.total)));
    return Array.from(map, ([type, total]) => ({
      name: ORDER_TYPE_LABELS[type] ?? type,
      value: Math.round(total),
    }));
  }, [scoped]);

  const sellers = useMemo<SellerRow[]>(() => {
    const map = new Map<string, SellerRow>();
    scoped.forEach((o) =>
      (o.pos_order_items ?? [])
        .filter((l) => !l.voided)
        .forEach((l) => {
          const row = map.get(l.name) ?? { name: l.name, quantity: 0, revenue: 0, cost: 0 };
          row.quantity += l.quantity;
          row.revenue += Number(l.line_total);
          row.cost += Number(l.cost_price) * l.quantity;
          map.set(l.name, row);
        }),
    );
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 15);
  }, [scoped]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restaurant Reports"
        description="Sales, margin and menu-engineering insight for every outlet."
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportMenu
              filename="restaurant-best-sellers"
              title="Best Sellers"
              subtitle={`${outlet?.name ?? "All outlets"} · last ${range} days`}
              columns={[
                { header: "Item", value: (r: SellerRow) => r.name },
                { header: "Qty sold", value: (r: SellerRow) => r.quantity, align: "right" },
                { header: "Revenue", value: (r: SellerRow) => Math.round(r.revenue), align: "right" },
                {
                  header: "Margin %",
                  value: (r: SellerRow) =>
                    r.revenue > 0 ? Math.round(((r.revenue - r.cost) / r.revenue) * 100) : 0,
                  align: "right",
                },
              ]}
              rows={sellers}
            />
            <OutletSwitcher value={outletId} onChange={select} />
          </div>
        }
      />

      {isLoading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Net revenue"
            value={formatCurrency(stats.revenue, currency)}
            icon={TrendingUp}
            accent="success"
            hint={`${stats.orders} orders`}
            index={0}
          />
          <StatCard
            label="Average check"
            value={formatCurrency(stats.avg, currency)}
            icon={Receipt}
            accent="primary"
            index={1}
          />
          <StatCard label="Covers" value={stats.covers} icon={Utensils} accent="info" index={2} />
          <StatCard
            label="Gross margin"
            value={`${stats.margin.toFixed(1)}%`}
            icon={Percent}
            accent="warning"
            index={3}
          />
        </div>
      )}

      {scoped.length === 0 && !isLoading ? (
        <EmptyState
          icon={BarChart3}
          title="No sales in this period"
          description="Once orders are paid at the POS, analytics appear here."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold">Daily revenue</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="currentColor" />
                    <YAxis tick={{ fontSize: 11 }} stroke="currentColor" width={70} />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v, currency)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold">Revenue by order type</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                      {mix.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v, currency)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="overflow-x-auto p-0">
            <div className="border-b px-5 py-4">
              <h2 className="text-sm font-semibold">Best sellers &amp; menu engineering</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(r.revenue, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.revenue > 0 ? (((r.revenue - r.cost) / r.revenue) * 100).toFixed(0) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

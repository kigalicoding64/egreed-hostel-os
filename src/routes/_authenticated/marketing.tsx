import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone,
  Plus,
  TrendingUp,
  Target,
  Wallet,
  Pencil,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_CHANNEL_LABELS,
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_OBJECTIVE_LABELS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_TONE,
  campaignMetrics,
} from "@/lib/enterprise-constants";
import { MANAGEMENT_ROLES } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing & Campaigns — EGREED Hospitality" },
      {
        name: "description",
        content:
          "Plan campaigns across email, SMS and OTA channels, track spend, conversions and revenue attribution.",
      },
      { property: "og:title", content: "Marketing & Campaigns — EGREED Hospitality" },
      {
        property: "og:description",
        content: "Campaign performance, ROI and channel mix for the property.",
      },
    ],
  }),
  component: MarketingPage,
});

interface Campaign {
  id: string;
  name: string;
  channel: string;
  objective: string;
  audience: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  spend: number;
  audience_size: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  converted_count: number;
  revenue: number;
  notes: string | null;
}

const EMPTY = {
  name: "",
  channel: "email",
  objective: "bookings",
  audience: "",
  status: "draft",
  start_date: "",
  end_date: "",
  budget: "0",
  spend: "0",
  audience_size: "0",
  sent_count: "0",
  opened_count: "0",
  clicked_count: "0",
  converted_count: "0",
  revenue: "0",
  notes: "",
};

function MarketingPage() {
  const qc = useQueryClient();
  const { hasAnyRole, user } = useAuth();
  const { data: hotel } = useHotelRef();

  const canView = hasAnyRole([...MANAGEMENT_ROLES, "marketing_manager"]);

  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["marketing-campaigns"],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_campaigns")
        .select(
          "id,name,channel,objective,audience,status,start_date,end_date,budget,spend,audience_size,sent_count,opened_count,clicked_count,converted_count,revenue,notes",
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as unknown as Campaign[];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name,
      channel: c.channel,
      objective: c.objective,
      audience: c.audience ?? "",
      status: c.status,
      start_date: c.start_date ?? "",
      end_date: c.end_date ?? "",
      budget: String(c.budget),
      spend: String(c.spend),
      audience_size: String(c.audience_size),
      sent_count: String(c.sent_count),
      opened_count: String(c.opened_count),
      clicked_count: String(c.clicked_count),
      converted_count: String(c.converted_count),
      revenue: String(c.revenue),
      notes: c.notes ?? "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Campaign name is required");
      const payload = {
        hotel_id: hotel?.hotelId ?? null,
        name: form.name.trim(),
        channel: form.channel,
        objective: form.objective,
        audience: form.audience || null,
        status: form.status as Campaign["status"],
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: Number(form.budget) || 0,
        spend: Number(form.spend) || 0,
        audience_size: Number(form.audience_size) || 0,
        sent_count: Number(form.sent_count) || 0,
        opened_count: Number(form.opened_count) || 0,
        clicked_count: Number(form.clicked_count) || 0,
        converted_count: Number(form.converted_count) || 0,
        revenue: Number(form.revenue) || 0,
        notes: form.notes || null,
      };
      if (editing) {
        const { error } = await supabase
          .from("marketing_campaigns")
          .update(payload as never)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("marketing_campaigns")
          .insert({ ...payload, created_by: user?.id ?? null } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Campaign updated" : "Campaign created");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["marketing-campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let rows = campaigns;
    if (status !== "all") rows = rows.filter((c) => c.status === status);
    if (channel !== "all") rows = rows.filter((c) => c.channel === channel);
    if (q.trim()) {
      const term = q.toLowerCase();
      rows = rows.filter((c) => [c.name, c.audience].some((v) => v?.toLowerCase().includes(term)));
    }
    return rows;
  }, [campaigns, status, channel, q]);

  const totals = useMemo(() => {
    const spend = campaigns.reduce((a, c) => a + Number(c.spend), 0);
    const revenue = campaigns.reduce((a, c) => a + Number(c.revenue), 0);
    const conversions = campaigns.reduce((a, c) => a + c.converted_count, 0);
    const active = campaigns.filter((c) => c.status === "active").length;
    return {
      spend,
      revenue,
      conversions,
      active,
      roi: spend > 0 ? ((revenue - spend) / spend) * 100 : 0,
    };
  }, [campaigns]);

  const chartData = useMemo(() => {
    const map = new Map<string, { channel: string; spend: number; revenue: number }>();
    campaigns.forEach((c) => {
      const key = CAMPAIGN_CHANNEL_LABELS[c.channel] ?? c.channel;
      const row = map.get(key) ?? { channel: key, spend: 0, revenue: 0 };
      row.spend += Number(c.spend);
      row.revenue += Number(c.revenue);
      map.set(key, row);
    });
    return [...map.values()];
  }, [campaigns]);

  const numField = (key: keyof typeof EMPTY, label: string) => (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <AccessGuard allowed={canView} feature="Marketing">
      <div className="space-y-6">
        <PageHeader
          title="Marketing & Campaigns"
          description="Plan campaigns, track spend and attribute revenue across every channel."
          icon={<Megaphone className="h-5 w-5" />}
          actions={
            <div className="flex items-center gap-2">
              <ExportMenu
                filename={`campaigns-${new Date().toISOString().slice(0, 10)}`}
                title="Marketing Campaign Performance"
                rows={filtered}
                columns={[
                  { header: "Campaign", value: (r) => r.name },
                  { header: "Channel", value: (r) => CAMPAIGN_CHANNEL_LABELS[r.channel] ?? r.channel },
                  { header: "Status", value: (r) => CAMPAIGN_STATUS_LABELS[r.status] ?? r.status },
                  { header: "Budget", value: (r) => r.budget },
                  { header: "Spend", value: (r) => r.spend },
                  { header: "Conversions", value: (r) => r.converted_count },
                  { header: "Revenue", value: (r) => r.revenue },
                  { header: "ROI %", value: (r) => campaignMetrics(r).roi.toFixed(1) },
                ]}
              />
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> New Campaign
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <StatCardsSkeleton count={4} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active campaigns" value={totals.active} icon={Megaphone} accent="info" index={0} />
            <StatCard label="Total spend" value={formatCurrency(totals.spend)} icon={Wallet} accent="warning" index={1} />
            <StatCard
              label="Attributed revenue"
              value={formatCurrency(totals.revenue)}
              icon={TrendingUp}
              accent="success"
              hint={`ROI ${totals.roi.toFixed(0)}%`}
              index={2}
            />
            <StatCard label="Conversions" value={formatNumber(totals.conversions)} icon={Target} accent="primary" index={3} />
          </div>
        )}

        {chartData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">Spend vs revenue by channel</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="channel" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="spend" name="Spend" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center">
            <Input
              placeholder="Search campaigns…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {CAMPAIGN_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{CAMPAIGN_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {CAMPAIGN_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>{CAMPAIGN_CHANNEL_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="p-6"><TableSkeleton /></div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Megaphone}
                title="No campaigns yet"
                description="Create your first campaign to track spend, conversions and revenue attribution."
                action={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New Campaign</Button>}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Budget use</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const m = campaignMetrics(c);
                  const usage = c.budget > 0 ? Math.min((c.spend / c.budget) * 100, 100) : 0;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {CAMPAIGN_CHANNEL_LABELS[c.channel] ?? c.channel} ·{" "}
                          {CAMPAIGN_OBJECTIVE_LABELS[c.objective] ?? c.objective}
                          {c.audience ? ` · ${c.audience}` : ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        <TonedBadge tone={CAMPAIGN_STATUS_TONE[c.status]}>
                          {CAMPAIGN_STATUS_LABELS[c.status]}
                        </TonedBadge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(c.start_date)} → {formatDate(c.end_date)}
                      </TableCell>
                      <TableCell className="w-40">
                        <Progress value={usage} className="h-2" />
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(c.spend)} / {formatCurrency(c.budget)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatNumber(c.converted_count)}
                        <span className="block text-xs text-muted-foreground">
                          {m.conversionRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(c.revenue)}</TableCell>
                      <TableCell className="text-right">
                        <TonedBadge tone={m.roi >= 0 ? "success" : "destructive"}>
                          {m.roi.toFixed(0)}%
                        </TonedBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit campaign" : "New campaign"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_CHANNELS.map((c) => (
                      <SelectItem key={c} value={c}>{CAMPAIGN_CHANNEL_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Objective</Label>
                <Select value={form.objective} onValueChange={(v) => setForm({ ...form, objective: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_OBJECTIVES.map((o) => (
                      <SelectItem key={o} value={o}>{CAMPAIGN_OBJECTIVE_LABELS[o]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{CAMPAIGN_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audience segment</Label>
                <Input
                  placeholder="e.g. Past corporate guests"
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                />
              </div>
              <div>
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>End date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
              {numField("budget", "Budget")}
              {numField("spend", "Spend")}
              {numField("audience_size", "Audience size")}
              {numField("sent_count", "Sent")}
              {numField("opened_count", "Opened")}
              {numField("clicked_count", "Clicked")}
              {numField("converted_count", "Conversions")}
              {numField("revenue", "Attributed revenue")}
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {editing ? "Save changes" : "Create campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccessGuard>
  );
}

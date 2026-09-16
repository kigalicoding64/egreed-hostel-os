import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Wallet,
  BedDouble,
  DoorOpen,
  CalendarClock,
  Sparkles,
  LogIn,
  LogOut,
  TrendingUp,
  ArrowRight,
  Plus,
  UserPlus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatCardsSkeleton } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, formatDate, initials, timeAgo } from "@/lib/format";
import { RoomCalendar } from "@/components/reservations/RoomCalendar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

async function loadDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [rooms, reservations, payments, recentRes, recentPay] = await Promise.all([
    supabase.from("rooms").select("status"),
    supabase.from("reservations").select("id,status,check_in,check_out,total_amount"),
    supabase.from("payments").select("amount,paid_at").order("paid_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("id,reference,status,check_in,check_out,total_amount,guests(full_name)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("payments")
      .select("id,amount,method,status,paid_at")
      .order("paid_at", { ascending: false })
      .limit(6),
  ]);

  const roomRows = rooms.data ?? [];
  const total = roomRows.length;
  const count = (s: string) => roomRows.filter((r) => r.status === s).length;
  const occupied = count("occupied");
  const available = count("available");
  const reserved = count("reserved");
  const dirty = count("dirty") + count("cleaning");

  const resRows = reservations.data ?? [];
  const checkins = resRows.filter((r) => r.check_in === today).length;
  const checkouts = resRows.filter((r) => r.check_out === today).length;

  const payRows = payments.data ?? [];
  const todayRevenue = payRows
    .filter((p) => (p.paid_at ?? "").slice(0, 10) === today)
    .reduce((s, p) => s + Number(p.amount), 0);

  // 7-day revenue series
  const days: { day: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const rev = payRows
      .filter((p) => (p.paid_at ?? "").slice(0, 10) === key)
      .reduce((s, p) => s + Number(p.amount), 0);
    days.push({ day: d.toLocaleDateString("en", { weekday: "short" }), revenue: rev });
  }

  const occupancyData = [
    { name: "Occupied", value: occupied },
    { name: "Reserved", value: reserved },
    { name: "Available", value: available },
    { name: "Dirty", value: dirty },
  ];

  return {
    total,
    occupied,
    available,
    reserved,
    dirty,
    checkins,
    checkouts,
    todayRevenue,
    occupancyRate: total ? Math.round(((occupied + reserved) / total) * 100) : 0,
    revenueSeries: days,
    occupancyData,
    recentReservations: recentRes.data ?? [],
    recentPayments: recentPay.data ?? [],
  };
}

function DashboardPage() {
  const { profile, roles, hasAnyRole } = useAuth();
  const canEditBookings =
    roles.includes("super_admin") ||
    hasAnyRole(["hotel_owner", "general_manager", "receptionist"]);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: loadDashboard,
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}${profile?.full_name ? ", " + profile.full_name.split(" ")[0] : ""}`}
        description="Here's what's happening at Hotel Kwa Rugeyo today."
        icon={<TrendingUp className="h-5 w-5" />}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/guests">
                <UserPlus className="mr-1.5 h-4 w-4" /> New guest
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/reservations">
                <Plus className="mr-1.5 h-4 w-4" /> New reservation
              </Link>
            </Button>
          </>
        }
      />

      {isLoading || !data ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              index={0}
              label="Today's Revenue"
              value={formatCurrency(data.todayRevenue)}
              icon={Wallet}
              accent="success"
              hint="Payments received today"
            />
            <StatCard
              index={1}
              label="Occupancy"
              value={`${data.occupancyRate}%`}
              icon={TrendingUp}
              accent="primary"
              hint={`${data.occupied + data.reserved} of ${data.total} rooms`}
            />
            <StatCard
              index={2}
              label="Available Rooms"
              value={data.available}
              icon={DoorOpen}
              accent="info"
              hint={`${data.reserved} reserved`}
            />
            <StatCard
              index={3}
              label="Rooms to Clean"
              value={data.dirty}
              icon={Sparkles}
              accent="warning"
              hint="Dirty / cleaning"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard index={4} label="Occupied" value={data.occupied} icon={BedDouble} accent="info" />
            <StatCard index={5} label="Reserved" value={data.reserved} icon={CalendarClock} accent="primary" />
            <StatCard index={6} label="Check-ins Today" value={data.checkins} icon={LogIn} accent="success" />
            <StatCard index={7} label="Check-outs Today" value={data.checkouts} icon={LogOut} accent="warning" />
          </div>

          {/* Room calendar */}
          <RoomCalendar days={10} canEdit={canEditBookings} />

          {/* Charts */}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-card lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue — last 7 days</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.revenueSeries}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <RTooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--color-popover-foreground)",
                      }}
                      formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Room Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.occupancyData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={72} />
                    <RTooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--color-popover-foreground)",
                      }}
                    />
                    <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 6, 6, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent activity */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Reservations</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/reservations">
                    View all <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {data.recentReservations.length === 0 ? (
                  <EmptyState icon={CalendarClock} title="No reservations yet" />
                ) : (
                  <div className="space-y-1">
                    {data.recentReservations.map((r) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {initials((r.guests as { full_name?: string } | null)?.full_name ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {(r.guests as { full_name?: string } | null)?.full_name ?? "Guest"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(r.check_in)} → {formatDate(r.check_out)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(r.total_amount)}</p>
                          <StatusBadge status={r.status} className="mt-0.5" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Payments</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/payments">
                    View all <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {data.recentPayments.length === 0 ? (
                  <EmptyState icon={Wallet} title="No payments yet" />
                ) : (
                  <div className="space-y-1">
                    {data.recentPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium capitalize">
                            {p.method.replace("_", " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">{timeAgo(p.paid_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-success">
                            {formatCurrency(p.amount)}
                          </p>
                          <StatusBadge status={p.status} className="mt-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

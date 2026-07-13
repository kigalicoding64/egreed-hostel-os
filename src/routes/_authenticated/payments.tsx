import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/LoadingState";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payments")({
  component: PaymentsPage,
});

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  paid_at: string;
}

function PaymentsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["payments-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id,amount,method,status,reference,paid_at")
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
  });

  const total = data.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Recorded transactions across all channels." icon={<Wallet className="h-5 w-5" />} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Collected" value={formatCurrency(total)} icon={Wallet} accent="success" />
        <StatCard label="Transactions" value={data.length} icon={Wallet} accent="primary" index={1} />
        <StatCard
          label="Average"
          value={formatCurrency(data.length ? total / data.length : 0)}
          icon={Wallet}
          accent="info"
          index={2}
        />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton /></div>
          ) : data.length === 0 ? (
            <div className="p-6"><EmptyState icon={Wallet} title="No payments yet" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium capitalize">{p.method.replace("_", " ")}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.reference ?? "—"}</TableCell>
                    <TableCell>{formatDateTime(p.paid_at)}</TableCell>
                    <TableCell className="text-right font-semibold text-success">{formatCurrency(p.amount)}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

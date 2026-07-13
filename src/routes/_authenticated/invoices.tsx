import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
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
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices")({
  component: InvoicesPage,
});

interface Invoice {
  id: string;
  number: string;
  amount: number;
  tax: number;
  total: number;
  status: string;
  issued_at: string;
  guests: { full_name: string } | null;
}

function InvoicesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id,number,amount,tax,total,status,issued_at,guests(full_name)")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Invoice[];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Guest billing and outstanding balances." icon={<Receipt className="h-5 w-5" />} />
      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton /></div>
          ) : data.length === 0 ? (
            <div className="p-6"><EmptyState icon={Receipt} title="No invoices yet" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                    <TableCell className="font-medium">{inv.guests?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(inv.amount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(inv.tax)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(inv.total)}</TableCell>
                    <TableCell>{formatDate(inv.issued_at)}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
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

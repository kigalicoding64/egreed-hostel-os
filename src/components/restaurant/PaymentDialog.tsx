import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Printer, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/restaurant-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

export interface PayableOrder {
  id: string;
  hotel_id: string;
  order_number: string;
  total: number;
  paid_amount: number;
  room_id: string | null;
  guest_id: string | null;
}

interface Props {
  order: PayableOrder | null;
  outletName?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPaid?: () => void;
}

interface Split {
  method: string;
  amount: string;
  reference: string;
}

/** Split / partial payment capture with receipt printing and email. */
export function PaymentDialog({ order, outletName, open, onOpenChange, onPaid }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const due = Math.max((order?.total ?? 0) - (order?.paid_amount ?? 0), 0);
  const [splits, setSplits] = useState<Split[]>([
    { method: "cash", amount: "", reference: "" },
  ]);
  const [tip, setTip] = useState("0");
  const [email, setEmail] = useState("");

  const entered = useMemo(
    () => splits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0),
    [splits],
  );
  const remaining = Math.max(due - entered, 0);

  const reset = () => {
    setSplits([{ method: "cash", amount: "", reference: "" }]);
    setTip("0");
  };

  const pay = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error("No order selected");
      const rows = splits
        .filter((s) => (parseFloat(s.amount) || 0) > 0)
        .map((s) => ({
          hotel_id: order.hotel_id,
          order_id: order.id,
          amount: parseFloat(s.amount),
          method: s.method as never,
          reference: s.reference || null,
          tip: 0,
          created_by: user?.id ?? null,
        }));
      if (!rows.length) throw new Error("Enter at least one payment amount");

      const { error: payErr } = await supabase.from("pos_payments").insert(rows);
      if (payErr) throw payErr;

      const tipValue = parseFloat(tip) || 0;
      const paid = order.paid_amount + entered;
      const total = order.total + tipValue;
      const fullyPaid = paid >= total - 0.01;

      const { error } = await supabase
        .from("pos_orders")
        .update({
          paid_amount: paid,
          tip: tipValue,
          total,
          status: fullyPaid ? "paid" : "partially_paid",
          charged_to_room: splits.some((s) => s.method === "other") ? false : undefined,
          closed_at: fullyPaid ? new Date().toISOString() : null,
        })
        .eq("id", order.id);
      if (error) throw error;
      return { fullyPaid };
    },
    onSuccess: ({ fullyPaid }) => {
      toast.success(fullyPaid ? "Payment complete" : "Partial payment recorded");
      qc.invalidateQueries({ queryKey: ["rms-orders"] });
      reset();
      onPaid?.();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const printReceipt = () => {
    if (!order) return;
    const win = window.open("", "_blank", "width=380,height=640");
    if (!win) return;
    win.document.write(
      `<pre style="font-family:ui-monospace,monospace;font-size:12px">
EGREED HOSPITALITY
${outletName ?? "Outlet"}
Receipt ${order.order_number}
${new Date().toLocaleString()}
--------------------------------
TOTAL      ${formatCurrency(order.total)}
PAID       ${formatCurrency(order.paid_amount + entered)}
BALANCE    ${formatCurrency(remaining)}
--------------------------------
Thank you for dining with us.
</pre>`,
    );
    win.document.close();
    win.print();
  };

  const emailReceipt = () => {
    if (!order) return;
    const body = `Receipt ${order.order_number}%0D%0ATotal: ${order.total}%0D%0APaid: ${
      order.paid_amount + entered
    }`;
    window.location.href = `mailto:${email}?subject=Receipt ${order.order_number}&body=${body}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment · {order?.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <Row label="Order total" value={formatCurrency(order?.total ?? 0)} />
            <Row label="Already paid" value={formatCurrency(order?.paid_amount ?? 0)} />
            <Separator className="my-2" />
            <Row label="Balance due" value={formatCurrency(remaining)} bold />
          </div>

          <div className="space-y-2">
            <Label>Payment methods (split supported)</Label>
            {splits.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={s.method}
                  onValueChange={(v) =>
                    setSplits((rows) => rows.map((r, x) => (x === i ? { ...r, method: v } : r)))
                  }
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  inputMode="decimal"
                  placeholder="Amount"
                  value={s.amount}
                  onChange={(e) =>
                    setSplits((rows) =>
                      rows.map((r, x) => (x === i ? { ...r, amount: e.target.value } : r)),
                    )
                  }
                />
                <Input
                  placeholder="Ref"
                  className="w-24"
                  value={s.reference}
                  onChange={(e) =>
                    setSplits((rows) =>
                      rows.map((r, x) => (x === i ? { ...r, reference: e.target.value } : r)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove split"
                  disabled={splits.length === 1}
                  onClick={() => setSplits((rows) => rows.filter((_, x) => x !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSplits((rows) => [...rows, { method: "card", amount: "", reference: "" }])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Split
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSplits((rows) =>
                    rows.map((r, i) => (i === 0 ? { ...r, amount: String(due) } : r)),
                  )
                }
              >
                Exact amount
              </Button>
              {order?.room_id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSplits([{ method: "other", amount: String(due), reference: "Room charge" }])
                  }
                >
                  Charge to room
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tip</Label>
              <Input inputMode="decimal" value={tip} onChange={(e) => setTip(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email receipt to</Label>
              <Input
                type="email"
                placeholder="guest@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={printReceipt}>
              <Printer className="mr-1 h-4 w-4" /> Print
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!email}
              onClick={emailReceipt}
            >
              <Mail className="mr-1 h-4 w-4" /> Email
            </Button>
          </div>
          <Button onClick={() => pay.mutate()} disabled={pay.isPending || entered <= 0}>
            {pay.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Take {formatCurrency(entered)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  UtensilsCrossed,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  CreditCard,
  WifiOff,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { TonedBadge } from "@/components/common/TonedBadge";
import { OutletSwitcher } from "@/components/restaurant/OutletSwitcher";
import { PaymentDialog, type PayableOrder } from "@/components/restaurant/PaymentDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import {
  ORDER_TYPES,
  ORDER_TYPE_LABELS,
  ORDER_PRIORITIES,
  ORDER_PRIORITY_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  computeOrderTotals,
  nextOrderNumber,
} from "@/lib/restaurant-constants";
import {
  useMenu,
  useOrders,
  useOutlets,
  useRmsAccess,
  useTables,
  type MenuItem,
} from "@/hooks/use-restaurant";
import { enqueueOrder } from "@/lib/offline-queue";
import { useOfflineOrders } from "@/hooks/use-offline-orders";
import { RmsGuard } from "@/components/restaurant/RmsGuard";

export const Route = createFileRoute("/_authenticated/restaurant/pos")({
  head: () => ({
    meta: [
      { title: "Point of Sale — EGREED Hospitality Enterprise" },
      {
        name: "description",
        content:
          "Touch-friendly restaurant point of sale: fast order entry, split bills, discounts and multi-method payments.",
      },
      { property: "og:title", content: "Point of Sale — EGREED Hospitality" },
      {
        property: "og:description",
        content: "Fast order entry, split bills and multi-method payments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PosPage,
});

interface CartLine {
  key: string;
  menu_item_id: string;
  name: string;
  unit_price: number;
  cost_price: number;
  quantity: number;
  notes: string;
}

function PosPage() {
  const { user } = useAuth();
  const access = useRmsAccess();
  const qc = useQueryClient();
  const { outlet, outletId, select } = useOutlets();
  const { data: menu, isLoading: menuLoading } = useMenu(outletId);
  const { data: tables = [] } = useTables(outletId);
  const { data: openOrders = [] } = useOrders({
    outletId,
    statuses: ["open", "sent", "partially_paid"],
    refetchInterval: 20000,
  });

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderType, setOrderType] = useState<string>("dine_in");
  const [priority, setPriority] = useState<string>("normal");
  const [tableId, setTableId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [covers, setCovers] = useState("2");
  const [discount, setDiscount] = useState("0");
  const [coupon, setCoupon] = useState("");
  const [notes, setNotes] = useState("");
  const [payOrder, setPayOrder] = useState<PayableOrder | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const offline = useOfflineOrders();
  const online = offline.online;

  const { data: rooms = [] } = useQuery({
    queryKey: ["rms-rooms"],
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id,room_number,status")
        .order("room_number");
      if (error) throw error;
      return data ?? [];
    },
  });


  // Keyboard shortcuts: "/" focuses search, Ctrl+Enter sends the order.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        document.getElementById("pos-send")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const categories = useMemo(
    () =>
      (menu?.categories ?? []).filter((c) => !outletId || !c.outlet_id || c.outlet_id === outletId),
    [menu, outletId],
  );

  const items = useMemo(() => {
    let rows = (menu?.items ?? []).filter((i) => i.is_available);
    if (outletId) rows = rows.filter((i) => !i.outlet_id || i.outlet_id === outletId);
    if (categoryId !== "all") rows = rows.filter((i) => i.category_id === categoryId);
    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter(
        (i) =>
          i.name.toLowerCase().includes(term) ||
          (i.barcode ?? "").toLowerCase() === term ||
          (i.sku ?? "").toLowerCase().includes(term),
      );
    }
    return rows;
  }, [menu, categoryId, search, outletId]);

  const totals = computeOrderTotals({
    lines: cart.map((l) => ({ quantity: l.quantity, unit_price: l.unit_price })),
    discount: parseFloat(discount) || 0,
    taxRate: Number(outlet?.tax_rate ?? 0),
    serviceRate: orderType === "takeaway" ? 0 : Number(outlet?.service_charge_rate ?? 0),
  });

  const addItem = (item: MenuItem) => {
    setCart((rows) => {
      const found = rows.find((r) => r.menu_item_id === item.id);
      if (found) {
        return rows.map((r) =>
          r.menu_item_id === item.id ? { ...r, quantity: r.quantity + 1 } : r,
        );
      }
      return [
        ...rows,
        {
          key: crypto.randomUUID(),
          menu_item_id: item.id,
          name: item.name,
          unit_price: Number(item.price),
          cost_price: Number(item.cost_price),
          quantity: 1,
          notes: "",
        },
      ];
    });
    if (item.age_restricted) toast.warning(`${item.name}: verify guest is 18+`);
  };

  const setQty = (key: string, delta: number) =>
    setCart((rows) =>
      rows
        .map((r) => (r.key === key ? { ...r, quantity: r.quantity + delta } : r))
        .filter((r) => r.quantity > 0),
    );

  const submit = useMutation({
    mutationFn: async ({ pay }: { pay: boolean }) => {
      if (!outlet) throw new Error("Select an outlet first");
      if (!cart.length) throw new Error("The order is empty");

      const orderPayload = {
        hotel_id: outlet.hotel_id,
        outlet_id: outlet.id,
        order_number: nextOrderNumber(outlet.type === "bar" ? "BAR" : "ORD"),
        type: orderType as never,
        status: "sent" as never,
        kitchen_status: "new" as never,
        priority: priority as never,
        table_id: orderType === "dine_in" && tableId ? tableId : null,
        room_id: orderType === "room_service" && roomId ? roomId : null,
        waiter_id: user?.id ?? null,
        created_by: user?.id ?? null,
        covers: parseInt(covers) || 1,
        subtotal: totals.subtotal,
        discount: totals.discount,
        coupon_code: coupon || null,
        service_charge: totals.serviceCharge,
        tax: totals.tax,
        total: totals.total,
        notes: notes || null,
      };
      const itemsPayload = cart.map((l) => ({
        menu_item_id: l.menu_item_id,
        name: l.name,
        quantity: l.quantity,
        unit_price: l.unit_price,
        cost_price: l.cost_price,
        line_total: l.quantity * l.unit_price,
        notes: l.notes || null,
      }));

      if (!navigator.onLine) {
        enqueueOrder({
          order: orderPayload,
          items: itemsPayload,
          rates: {
            taxRate: Number(outlet.tax_rate ?? 0),
            serviceRate: orderType === "takeaway" ? 0 : Number(outlet.service_charge_rate ?? 0),
            discount: parseFloat(discount) || 0,
            tip: 0,
          },
        });
        offline.refreshQueue();
        return { queued: true as const };
      }

      const { data: order, error } = await supabase
        .from("pos_orders")
        .insert(orderPayload)
        .select("id,hotel_id,order_number,total,paid_amount,room_id,guest_id")
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase
        .from("pos_order_items")
        .insert(itemsPayload.map((i) => ({ ...i, order_id: order.id })));
      if (itemsError) throw itemsError;

      if (orderPayload.table_id) {
        await supabase
          .from("restaurant_tables")
          .update({ status: "occupied" })
          .eq("id", orderPayload.table_id);
      }
      return { queued: false as const, order: order as PayableOrder, pay };
    },
    onSuccess: (res) => {
      setCart([]);
      setDiscount("0");
      setCoupon("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["rms-orders"] });
      qc.invalidateQueries({ queryKey: ["rms-tables"] });
      if (res.queued) {
        toast.warning("Offline — order queued and will sync automatically");
        return;
      }
      toast.success("Order sent to kitchen");
      if (res.pay && res.order) setPayOrder(res.order);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const voidOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pos_orders")
        .update({ status: "void", kitchen_status: "cancelled", closed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order voided");
      qc.invalidateQueries({ queryKey: ["rms-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <RmsGuard allowed={access.canSell} feature="Point of Sale">
    <div className="space-y-5">
      <PageHeader
        title="Point of Sale"
        description="Touch-friendly order entry. Press / to search, Ctrl+Enter to send."
        icon={<UtensilsCrossed className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            {!online && (
              <TonedBadge tone="warning">
                <WifiOff className="mr-1 inline h-3 w-3" /> Offline mode
              </TonedBadge>
            )}
            {offline.pending > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={offline.syncing || !online}
                onClick={() => void offline.sync()}
              >
                {offline.syncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync {offline.pending} queued
              </Button>
            )}
            <OutletSwitcher value={outletId} onChange={select} />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Menu */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                className="pl-9"
                placeholder="Search or scan barcode…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search menu"
              />
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[190px]" aria-label="Menu category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {menuLoading ? (
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching items"
              description="Adjust the search or pick another category."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((item, i) => (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => addItem(item)}
                  className="flex h-28 flex-col justify-between rounded-xl border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                >
                  <span className="line-clamp-2 text-sm font-medium">{item.name}</span>
                  <span className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(item.price, outlet?.currency ?? "RWF")}
                    </span>
                    {item.age_restricted && <TonedBadge tone="warning">18+</TonedBadge>}
                  </span>
                </motion.button>
              ))}
            </div>
          )}

          {/* Open tickets */}
          <Card className="p-0">
            <div className="border-b px-4 py-3 text-sm font-semibold">Open tickets</div>
            {openOrders.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No open tickets.</p>
            ) : (
              <ul className="divide-y">
                {openOrders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="font-medium">{o.order_number}</span>
                    <TonedBadge tone={ORDER_STATUS_TONE[o.status]}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </TonedBadge>
                    <span className="text-muted-foreground">
                      {o.restaurant_tables?.name ?? ORDER_TYPE_LABELS[o.type]}
                    </span>
                    <span className="ml-auto font-semibold">
                      {formatCurrency(o.total, outlet?.currency ?? "RWF")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setPayOrder({
                          id: o.id,
                          hotel_id: o.hotel_id,
                          order_number: o.order_number,
                          total: Number(o.total),
                          paid_amount: Number(o.paid_amount),
                          room_id: o.room_id,
                          guest_id: o.guest_id,
                        })
                      }
                    >
                      <CreditCard className="mr-1 h-4 w-4" /> Pay
                    </Button>
                    {access.canVoid && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Void order"
                        onClick={() => voidOrder.mutate(o.id)}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Cart */}
        <Card className="flex h-fit flex-col gap-3 p-4 lg:sticky lg:top-4">
          <div className="grid grid-cols-2 gap-2">
            <Select value={orderType} onValueChange={setOrderType}>
              <SelectTrigger aria-label="Order type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ORDER_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger aria-label="Priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {ORDER_PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {orderType === "dine_in" && (
            <Select value={tableId} onValueChange={setTableId}>
              <SelectTrigger aria-label="Table">
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · {t.seats} seats
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {orderType === "room_service" && (
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger aria-label="Room">
                <SelectValue placeholder="Charge to room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Room {r.room_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Separator />

          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tap menu items to build the order.
            </p>
          ) : (
            <ScrollArea className="max-h-[280px] pr-2">
              <ul className="space-y-2">
                {cart.map((l) => (
                  <li key={l.key} className="rounded-lg border p-2">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-medium">{l.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Decrease quantity"
                        onClick={() => setQty(l.key, -1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{l.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Increase quantity"
                        onClick={() => setQty(l.key, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-24 text-right text-sm font-semibold">
                        {formatCurrency(l.quantity * l.unit_price, outlet?.currency ?? "RWF")}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Remove line"
                        onClick={() => setCart((rows) => rows.filter((r) => r.key !== l.key))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      className="mt-1.5 h-7 text-xs"
                      placeholder="Modifier / kitchen note"
                      value={l.notes}
                      onChange={(e) =>
                        setCart((rows) =>
                          rows.map((r) => (r.key === l.key ? { ...r, notes: e.target.value } : r)),
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Covers</Label>
              <Input value={covers} onChange={(e) => setCovers(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Discount</Label>
              <Input
                value={discount}
                disabled={!access.canDiscount}
                onChange={(e) => setDiscount(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </div>
          <Input placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
          <Textarea
            rows={2}
            placeholder="Special requests"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
            <Line label="Subtotal" value={totals.subtotal} currency={outlet?.currency} />
            <Line label="Discount" value={-totals.discount} currency={outlet?.currency} />
            <Line label="Service charge" value={totals.serviceCharge} currency={outlet?.currency} />
            <Line label="Tax" value={totals.tax} currency={outlet?.currency} />
            <Separator className="my-1" />
            <Line label="Total" value={totals.total} currency={outlet?.currency} bold />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              id="pos-send"
              variant="outline"
              disabled={submit.isPending || !cart.length}
              onClick={() => submit.mutate({ pay: false })}
            >
              {submit.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              Send
            </Button>
            <Button
              disabled={submit.isPending || !cart.length}
              onClick={() => submit.mutate({ pay: true })}
            >
              <CreditCard className="mr-1 h-4 w-4" /> Send & Pay
            </Button>
          </div>
        </Card>
      </div>

      <PaymentDialog
        order={payOrder}
        outletName={outlet?.name}
        open={!!payOrder}
        onOpenChange={(v) => !v && setPayOrder(null)}
      />
    </div>
  );
}

function Line({
  label,
  value,
  currency,
  bold,
}: {
  label: string;
  value: number;
  currency?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "text-base font-semibold" : ""}>
        {formatCurrency(value, currency ?? "RWF")}
      </span>
    </div>
  );
}

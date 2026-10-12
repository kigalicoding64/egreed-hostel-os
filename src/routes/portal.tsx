import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BedDouble,
  CalendarCheck,
  Hotel,
  LogOut,
  Receipt,
  UtensilsCrossed,
  Wallet,
  Link2,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { HotelChat } from "@/components/ai/HotelChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { PageSkeleton } from "@/components/common/LoadingState";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { addDays, todayISO } from "@/lib/booking";
import { generateConfirmation, nightsBetween } from "@/lib/hotel-constants";
import { QrButton } from "@/components/qr/QrCode";
import { qrLink } from "@/lib/qr";

export const Route = createFileRoute("/portal")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({
    meta: [
      { title: "Guest Portal | EGREED Hospitality" },
      {
        name: "description",
        content:
          "View your stay, room status, restaurant orders and payments, and request a new booking.",
      },
      { property: "og:title", content: "Guest Portal | EGREED Hospitality" },
      {
        property: "og:description",
        content: "Your bookings, room, orders and payments in one secure place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuestPortal,
});

interface GuestRow {
  id: string;
  full_name: string;
  email: string | null;
  hotel_id: string | null;
  user_id: string | null;
  loyalty_points: number;
}

function GuestPortal() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [linking, setLinking] = useState(false);
  const [booking, setBooking] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["portal", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: guestRows } = await supabase
        .from("guests")
        .select("id,full_name,email,hotel_id,user_id,loyalty_points")
        .limit(5);
      const guests = (guestRows ?? []) as GuestRow[];
      const email = (user?.email ?? "").toLowerCase();
      const guest =
        guests.find((g) => g.user_id === user?.id) ??
        guests.find(
          (g) => !g.user_id && !!g.email && g.email.toLowerCase() === email,
        ) ??
        null;
      if (!guest) return { guest: null };

      const [reservations, invoices, payments, orders] = await Promise.all([
        supabase
          .from("reservations")
          .select(
            "id,reference,status,check_in,check_out,num_guests,total_amount,rooms(room_number,status,cleaning_status,room_types(name))",
          )
          .eq("guest_id", guest.id)
          .order("check_in", { ascending: false }),
        supabase
          .from("invoices")
          .select("id,number,total,status,issued_at,due_date")
          .eq("guest_id", guest.id)
          .order("issued_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id,amount,method,status,paid_at")
          .order("paid_at", { ascending: false }),
        supabase
          .from("pos_orders")
          .select("id,order_number,type,status,kitchen_status,total,opened_at")
          .eq("guest_id", guest.id)
          .order("opened_at", { ascending: false }),
      ]);

      return {
        guest,
        reservations: reservations.data ?? [],
        invoices: invoices.data ?? [],
        payments: payments.data ?? [],
        orders: orders.data ?? [],
      };
    },
  });

  const guest = data?.guest ?? null;
  const claimed = !!guest && guest.user_id === user?.id;
  const reservations = (data?.reservations ?? []) as Array<{
    id: string;
    reference: string;
    status: string;
    check_in: string;
    check_out: string;
    num_guests: number;
    total_amount: number;
    rooms: {
      room_number: string;
      status: string;
      cleaning_status: string;
      room_types: { name: string } | null;
    } | null;
  }>;
  const current =
    reservations.find((r) => r.status === "checked_in") ??
    reservations.find((r) => ["confirmed", "pending"].includes(r.status)) ??
    null;

  const claim = async () => {
    if (!guest) return;
    setLinking(true);
    const { error } = await supabase
      .from("guests")
      .update({ user_id: user!.id })
      .eq("id", guest.id);
    setLinking(false);
    if (error) {
      toast.error("Could not link your account");
      return;
    }
    toast.success("Account linked");
    qc.invalidateQueries({ queryKey: ["portal"] });
  };

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hotel className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">EGREED Guest Portal</p>
              <p className="text-[11px] text-muted-foreground">
                {guest?.full_name ?? user?.email}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {isLoading ? (
          <PageSkeleton />
        ) : !guest ? (
          <EmptyState
            icon={CalendarCheck}
            title="No booking found for this email"
            description="We could not match your sign-in email to a guest record. Please contact the front desk so they can add your email to your booking."
          />
        ) : (
          <>
            {!claimed && (
              <Card className="border-primary/40 bg-primary/5 shadow-card">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium">
                      We found a booking under {guest.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Link it to your account to see your stay details.
                    </p>
                  </div>
                  <Button size="sm" onClick={claim} disabled={linking}>
                    {linking ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-1.5 h-4 w-4" />
                    )}
                    Link my booking
                  </Button>
                </CardContent>
              </Card>
            )}

            {current && (
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Your stay</CardTitle>
                  <StatusBadge status={current.status} />
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-4">
                  <Detail label="Room" value={current.rooms?.room_number ?? "To be assigned"} />
                  <Detail
                    label="Room type"
                    value={current.rooms?.room_types?.name ?? "—"}
                  />
                  <Detail label="Check-in" value={formatDate(current.check_in)} />
                  <Detail label="Check-out" value={formatDate(current.check_out)} />
                  {current.rooms && (
                    <div>
                      <p className="text-xs text-muted-foreground">Room status</p>
                      <div className="mt-1 flex gap-1">
                        <StatusBadge status={current.rooms.status} />
                        <StatusBadge status={current.rooms.cleaning_status} />
                      </div>
                    </div>
                  )}
                  <Detail
                    label="Loyalty points"
                    value={String(guest.loyalty_points ?? 0)}
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button size="sm" disabled={!claimed} onClick={() => setBooking(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Request a booking
              </Button>
            </div>

            <Tabs defaultValue="stays">
              <TabsList>
                <TabsTrigger value="stays">Bookings</TabsTrigger>
                <TabsTrigger value="orders">Restaurant</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="concierge">Ask us</TabsTrigger>
              </TabsList>

              <TabsContent value="concierge" className="mt-4">
                <div className="h-[560px]">
                  <HotelChat
                    api="/api/chat/guest"
                    storageKey={`egreed.ai.guest.${user?.id ?? "anon"}`}
                    title="Virtual concierge"
                    subtitle="Ask about your stay, the hotel or send a message to reception."
                    placeholder="e.g. Can I get extra towels in my room?"
                    suggestions={[
                      "What time is check-out?",
                      "What's my room number?",
                      "What do I owe so far?",
                      "Please send extra towels to my room",
                    ]}
                  />
                </div>
              </TabsContent>

              <TabsContent value="stays" className="mt-4 space-y-3">
                {reservations.length === 0 ? (
                  <EmptyState icon={CalendarCheck} title="No bookings yet" />
                ) : (
                  reservations.map((r) => (
                    <Card key={r.id} className="shadow-card">
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div>
                          <p className="font-medium">
                            Room {r.rooms?.room_number ?? "to be assigned"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(r.check_in)} → {formatDate(r.check_out)} ·{" "}
                            {r.num_guests} guest{r.num_guests === 1 ? "" : "s"} ·{" "}
                            <span className="font-mono">{r.reference}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{formatCurrency(r.total_amount)}</span>
                          <StatusBadge status={r.status} />
                          <QrButton card={{ value: qrLink("booking", r.reference), title: `Booking ${r.reference}`, subtitle: `${formatDate(r.check_in)} → ${formatDate(r.check_out)}`, callToAction: "Show this at reception for a quick check-in" }} />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="orders" className="mt-4 space-y-3">
                {(data?.orders ?? []).length === 0 ? (
                  <EmptyState icon={UtensilsCrossed} title="No restaurant orders yet" />
                ) : (
                  (data?.orders ?? []).map((o) => (
                    <Card key={o.id} className="shadow-card">
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div>
                          <p className="font-medium capitalize">
                            {o.type.replace("_", " ")} · {o.order_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(o.opened_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{formatCurrency(o.total)}</span>
                          <StatusBadge status={o.kitchen_status} />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="billing" className="mt-4 space-y-3">
                {(data?.invoices ?? []).map((i) => (
                  <Card key={i.id} className="shadow-card">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{i.number}</p>
                          <p className="text-xs text-muted-foreground">
                            Issued {formatDate(i.issued_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatCurrency(i.total)}</span>
                        <StatusBadge status={i.status} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(data?.payments ?? []).map((p) => (
                  <Card key={p.id} className="shadow-card">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-success" />
                        <div>
                          <p className="font-medium capitalize">
                            {p.method.replace("_", " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(p.paid_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-success">
                          {formatCurrency(p.amount)}
                        </span>
                        <StatusBadge status={p.status} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(data?.invoices ?? []).length === 0 &&
                  (data?.payments ?? []).length === 0 && (
                    <EmptyState icon={Wallet} title="Nothing to show yet" />
                  )}
              </TabsContent>
            </Tabs>

            <BookingRequestDialog
              open={booking}
              onOpenChange={setBooking}
              guestId={guest.id}
              hotelId={guest.hotel_id}
              onDone={() => qc.invalidateQueries({ queryKey: ["portal"] })}
            />
          </>
        )}
      </main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
        <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
        {value}
      </p>
    </div>
  );
}

function BookingRequestDialog({
  open,
  onOpenChange,
  guestId,
  hotelId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  guestId: string;
  hotelId: string | null;
  onDone: () => void;
}) {
  const [checkIn, setCheckIn] = useState(addDays(todayISO(), 1));
  const [checkOut, setCheckOut] = useState(addDays(todayISO(), 2));
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!hotelId) {
      toast.error("Please contact the front desk to complete this request");
      return;
    }
    setSaving(true);
    const reference = generateConfirmation("WEB");
    const { error } = await supabase.from("reservations").insert({
      hotel_id: hotelId,
      guest_id: guestId,
      reference,
      confirmation_number: reference,
      check_in: checkIn,
      check_out: checkOut,
      num_guests: guests,
      adults: guests,
      status: "pending",
      source: "website",
      total_amount: 0,
      special_requests: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Booking request sent — the hotel will confirm shortly");
    onOpenChange(false);
    onDone();
  };

  const nights = nightsBetween(checkIn, checkOut);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a booking</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="portal-in">Check-in</Label>
            <Input
              id="portal-in"
              type="date"
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (checkOut <= e.target.value) setCheckOut(addDays(e.target.value, 1));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portal-out">Check-out</Label>
            <Input
              id="portal-out"
              type="date"
              min={addDays(checkIn, 1)}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portal-guests">Guests</Label>
            <Input
              id="portal-guests"
              type="number"
              min={1}
              value={guests}
              onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="portal-notes">Requests</Label>
            <Textarea
              id="portal-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {nights} night{nights === 1 ? "" : "s"} · the hotel confirms your room and rate.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

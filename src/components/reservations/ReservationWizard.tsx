import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useHotelRef } from "@/hooks/use-hotel";
import { useReservationInvalidate } from "@/hooks/use-reservations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatCurrency } from "@/lib/format";
import {
  RESERVATION_SOURCES,
  RESERVATION_SOURCE_LABELS,
  generateConfirmation,
  nightsBetween,
} from "@/lib/hotel-constants";
import {
  addDays,
  applyRatePlan,
  blocks,
  overlaps,
  quoteStay,
  todayISO,
} from "@/lib/booking";
import { cn } from "@/lib/utils";

const STEPS = ["Stay", "Guest", "Room", "Confirm"] as const;

interface RoomOption {
  id: string;
  room_number: string;
  status: string;
  base_price: number | null;
  max_guests: number;
  room_types: { name: string; base_rate: number } | null;
}

const UNAVAILABLE_ROOM_STATUSES = [
  "out_of_order",
  "out_of_service",
  "maintenance",
  "blocked",
];

export function ReservationWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const { data: ref } = useHotelRef();
  const invalidate = useReservationInvalidate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — stay
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(addDays(todayISO(), 1));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [source, setSource] = useState<string>("walk_in");

  // Step 2 — guest
  const [guestId, setGuestId] = useState<string>("");
  const [newGuest, setNewGuest] = useState({ full_name: "", email: "", phone: "" });
  const [guestSearch, setGuestSearch] = useState("");

  // Step 3 — room
  const [roomId, setRoomId] = useState("");
  const [ratePlanId, setRatePlanId] = useState<string>("none");

  // Step 4 — money
  const [discount, setDiscount] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [requests, setRequests] = useState("");

  const nights = nightsBetween(checkIn, checkOut);

  const { data: guests = [] } = useQuery({
    queryKey: ["wizard-guests"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("guests")
        .select("id,full_name,email,phone")
        .order("full_name")
        .limit(500);
      return (data ?? []) as { id: string; full_name: string; email: string | null; phone: string | null }[];
    },
  });

  const { data: availability } = useQuery({
    queryKey: ["wizard-availability", checkIn, checkOut],
    enabled: open && checkOut > checkIn,
    queryFn: async () => {
      const [roomsRes, resRes] = await Promise.all([
        supabase
          .from("rooms")
          .select("id,room_number,status,base_price,max_guests,room_types(name,base_rate)")
          .order("room_number"),
        supabase
          .from("reservations")
          .select("id,room_id,status,check_in,check_out")
          .lt("check_in", checkOut)
          .gt("check_out", checkIn),
      ]);
      return {
        rooms: (roomsRes.data ?? []) as unknown as RoomOption[],
        booked: (resRes.data ?? []) as {
          id: string;
          room_id: string | null;
          status: string;
          check_in: string;
          check_out: string;
        }[],
      };
    },
  });

  const availableRooms = useMemo(() => {
    if (!availability) return [];
    const taken = new Set(
      availability.booked
        .filter(
          (b) =>
            b.room_id &&
            blocks(b.status) &&
            overlaps(b, { check_in: checkIn, check_out: checkOut }),
        )
        .map((b) => b.room_id as string),
    );
    return availability.rooms.filter(
      (r) =>
        !taken.has(r.id) &&
        !UNAVAILABLE_ROOM_STATUSES.includes(r.status) &&
        r.max_guests >= adults + children,
    );
  }, [availability, checkIn, checkOut, adults, children]);

  const room = availableRooms.find((r) => r.id === roomId) ?? null;
  const plan = ref?.ratePlans.find((p) => p.id === ratePlanId) ?? null;
  const baseRate = Number(room?.base_price ?? room?.room_types?.base_rate ?? 0);
  const nightlyRate = applyRatePlan(baseRate, plan);
  const quote = quoteStay({ nightlyRate, nights, discount });

  const filteredGuests = guests.filter((g) =>
    `${g.full_name} ${g.email ?? ""} ${g.phone ?? ""}`
      .toLowerCase()
      .includes(guestSearch.toLowerCase()),
  );

  const reset = () => {
    setStep(0);
    setGuestId("");
    setNewGuest({ full_name: "", email: "", phone: "" });
    setRoomId("");
    setRatePlanId("none");
    setDiscount(0);
    setDeposit(0);
    setRequests("");
  };

  const canContinue = () => {
    if (step === 0) return checkOut > checkIn && adults > 0;
    if (step === 1) return !!guestId || newGuest.full_name.trim().length > 1;
    if (step === 2) return !!roomId;
    return true;
  };

  const submit = async () => {
    if (!ref?.hotelId) {
      toast.error("No active property configured");
      return;
    }
    setSaving(true);
    try {
      let finalGuestId = guestId;
      if (!finalGuestId) {
        const { data: created, error } = await supabase
          .from("guests")
          .insert({
            hotel_id: ref.hotelId,
            full_name: newGuest.full_name.trim(),
            email: newGuest.email.trim() || null,
            phone: newGuest.phone.trim() || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        finalGuestId = created.id;
      }

      const confirmation = generateConfirmation();
      const { error } = await supabase.from("reservations").insert({
        hotel_id: ref.hotelId,
        guest_id: finalGuestId,
        room_id: roomId,
        reference: confirmation,
        confirmation_number: confirmation,
        check_in: checkIn,
        check_out: checkOut,
        num_guests: adults + children,
        adults,
        children,
        status: "confirmed",
        source: source as "walk_in",
        rate_plan_id: ratePlanId === "none" ? null : ratePlanId,
        discount,
        deposit,
        total_amount: quote.total,
        special_requests: requests.trim() || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;

      await supabase.from("rooms").update({ status: "reserved" }).eq("id", roomId);

      invalidate();
      toast.success(`Reservation ${confirmation} created`);
      reset();
      onOpenChange(false);
    } catch (error) {
      const message = (error as { message?: string }).message ?? "Could not save booking";
      toast.error(
        message.includes("already booked")
          ? "That room was just booked for those dates. Pick another room."
          : message,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New reservation</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  i < step
                    ? "bg-success text-white"
                    : i === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:block",
                  i === step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wiz-in">Check-in</Label>
              <Input
                id="wiz-in"
                type="date"
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (checkOut <= e.target.value) setCheckOut(addDays(e.target.value, 1));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wiz-out">Check-out</Label>
              <Input
                id="wiz-out"
                type="date"
                min={addDays(checkIn, 1)}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wiz-adults">Adults</Label>
              <Input
                id="wiz-adults"
                type="number"
                min={1}
                value={adults}
                onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wiz-children">Children</Label>
              <Input
                id="wiz-children"
                type="number"
                min={0}
                value={children}
                onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Booking source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESERVATION_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {RESERVATION_SOURCE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {nights} night{nights === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wiz-search">Find an existing guest</Label>
              <Input
                id="wiz-search"
                placeholder="Search by name, email or phone"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
              />
            </div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-1">
              {filteredGuests.slice(0, 40).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGuestId(g.id === guestId ? "" : g.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                    guestId === g.id && "bg-primary/10 text-primary",
                  )}
                >
                  <span className="font-medium">{g.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {g.email ?? g.phone ?? ""}
                  </span>
                </button>
              ))}
              {filteredGuests.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No matching guest — create a new one below.
                </p>
              )}
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <UserPlus className="h-4 w-4" /> Or add a new guest
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-name">Full name</Label>
                  <Input
                    id="wiz-name"
                    value={newGuest.full_name}
                    onChange={(e) => {
                      setNewGuest({ ...newGuest, full_name: e.target.value });
                      setGuestId("");
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-email">Email</Label>
                  <Input
                    id="wiz-email"
                    type="email"
                    value={newGuest.email}
                    onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wiz-phone">Phone</Label>
                  <Input
                    id="wiz-phone"
                    value={newGuest.phone}
                    onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Use the guest&apos;s own email so they can sign in to the guest portal.
              </p>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {availableRooms.length} room{availableRooms.length === 1 ? "" : "s"} free for{" "}
              {adults + children} guest{adults + children === 1 ? "" : "s"} on these dates.
            </p>
            <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
              {availableRooms.map((r) => {
                const rate = applyRatePlan(
                  Number(r.base_price ?? r.room_types?.base_rate ?? 0),
                  plan,
                );
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoomId(r.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition hover:border-primary",
                      roomId === r.id && "border-primary bg-primary/5",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Room {r.room_number}</span>
                      <span className="text-sm font-semibold">{formatCurrency(rate)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.room_types?.name ?? "Room"} · sleeps {r.max_guests} · per night
                    </p>
                  </button>
                );
              })}
              {availableRooms.length === 0 && (
                <p className="col-span-full rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No rooms available for these dates. Go back and adjust the stay.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Rate plan</Label>
              <Select value={ratePlanId} onValueChange={setRatePlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Standard rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Standard rate</SelectItem>
                  {(ref?.ratePlans ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Guest</span>
                <span className="font-medium">
                  {guests.find((g) => g.id === guestId)?.full_name ?? newGuest.full_name}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Room</span>
                <span className="font-medium">{room?.room_number ?? "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Stay</span>
                <span>
                  {checkIn} → {checkOut} ({nights}n)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Source</span>
                <span>{RESERVATION_SOURCE_LABELS[source]}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">
                  {formatCurrency(nightlyRate)} × {nights}
                </span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t pt-2 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="wiz-discount">Discount</Label>
                <Input
                  id="wiz-discount"
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wiz-deposit">Deposit taken</Label>
                <Input
                  id="wiz-deposit"
                  type="number"
                  min={0}
                  value={deposit}
                  onChange={(e) => setDeposit(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wiz-requests">Special requests</Label>
              <Textarea
                id="wiz-requests"
                rows={2}
                value={requests}
                onChange={(e) => setRequests(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}
            disabled={saving}
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canContinue()}>
              Continue
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving || !roomId}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Create reservation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

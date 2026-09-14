import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMoveReservation, useSetReservationStatus } from "@/hooks/use-reservations";
import {
  addDays,
  blocks,
  findConflict,
  rangeDays,
  shortDay,
  todayISO,
} from "@/lib/booking";
import { nightsBetween } from "@/lib/hotel-constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CalRoom {
  id: string;
  room_number: string;
  status: string;
}

interface CalReservation {
  id: string;
  reference: string;
  status: string;
  check_in: string;
  check_out: string;
  room_id: string | null;
  total_amount: number;
  num_guests: number;
  guests: { full_name: string } | null;
}

const STATUS_BAR: Record<string, string> = {
  pending: "bg-warning/80 text-foreground",
  confirmed: "bg-info text-white",
  checked_in: "bg-success text-white",
  checked_out: "bg-muted-foreground/50 text-white",
  waitlist: "bg-primary/70 text-white",
  draft: "bg-muted-foreground/40 text-white",
};

const CELL = 46;

export function RoomCalendar({
  days = 14,
  canEdit = true,
}: {
  days?: number;
  canEdit?: boolean;
}) {
  const [start, setStart] = useState(() => todayISO());
  const [selected, setSelected] = useState<CalReservation | null>(null);
  const [drag, setDrag] = useState<{ id: string; nights: number; offset: number } | null>(
    null,
  );
  const [hover, setHover] = useState<string | null>(null);

  const move = useMoveReservation();
  const setStatus = useSetReservationStatus();

  const dayList = useMemo(() => rangeDays(start, days), [start, days]);
  const windowEnd = addDays(start, days);
  const today = todayISO();

  const { data, isLoading } = useQuery({
    queryKey: ["reservation-calendar", start, days],
    queryFn: async () => {
      const [roomsRes, resRes] = await Promise.all([
        supabase.from("rooms").select("id,room_number,status").order("room_number"),
        supabase
          .from("reservations")
          .select(
            "id,reference,status,check_in,check_out,room_id,total_amount,num_guests,guests(full_name)",
          )
          .lt("check_in", windowEnd)
          .gt("check_out", start),
      ]);
      if (roomsRes.error) throw roomsRes.error;
      if (resRes.error) throw resRes.error;
      return {
        rooms: (roomsRes.data ?? []) as CalRoom[],
        reservations: (resRes.data ?? []) as unknown as CalReservation[],
      };
    },
  });

  const rooms = data?.rooms ?? [];
  const reservations = data?.reservations ?? [];

  const arrivals = reservations.filter((r) => r.check_in === today && blocks(r.status));
  const departures = reservations.filter(
    (r) => r.check_out === today && r.status === "checked_in",
  );

  const handleDrop = (roomId: string, dateISO: string) => {
    setHover(null);
    if (!drag) return;
    const reservation = reservations.find((r) => r.id === drag.id);
    setDrag(null);
    if (!reservation) return;

    const newCheckIn = addDays(dateISO, -drag.offset);
    const newCheckOut = addDays(newCheckIn, drag.nights);
    if (reservation.room_id === roomId && reservation.check_in === newCheckIn) return;

    const conflict = findConflict(
      reservations,
      roomId,
      { check_in: newCheckIn, check_out: newCheckOut },
      reservation.id,
    );
    if (conflict) {
      toast.error(
        `Room is already booked for those dates (${conflict.reference ?? "existing booking"}).`,
      );
      return;
    }
    move.mutate({
      id: reservation.id,
      room_id: roomId,
      check_in: newCheckIn,
      check_out: newCheckOut,
    });
  };

  if (isLoading) {
    return (
      <Card className="shadow-card p-4">
        <Skeleton className="h-8 w-52" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Room calendar</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(start)} – {formatDate(addDays(windowEnd, -1))}
              {canEdit ? " · drag a booking to move it" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            {arrivals.length} arrivals today
          </span>
          <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
            {departures.length} departures today
          </span>
          <Button variant="outline" size="icon" onClick={() => setStart(addDays(start, -days))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStart(todayISO())}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setStart(addDays(start, days))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={CalendarRange}
            title="No rooms yet"
            description="Add rooms first and they will appear on the calendar."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: 160 + dayList.length * CELL }}>
            {/* Header */}
            <div className="flex border-b bg-muted/40">
              <div className="w-40 shrink-0 px-3 py-2 text-xs font-semibold text-muted-foreground">
                Room
              </div>
              {dayList.map((d) => {
                const info = shortDay(d);
                return (
                  <div
                    key={d}
                    style={{ width: CELL }}
                    className={cn(
                      "shrink-0 border-l py-1.5 text-center text-[11px]",
                      info.weekend && "bg-muted/60",
                      d === today && "bg-primary/10 font-semibold text-primary",
                    )}
                  >
                    <div className="text-muted-foreground">{info.label}</div>
                    <div className="font-medium">{info.day}</div>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {rooms.map((room) => {
              const bars = reservations.filter((r) => r.room_id === room.id);
              return (
                <div key={room.id} className="flex border-b last:border-b-0">
                  <div className="w-40 shrink-0 px-3 py-2">
                    <p className="text-sm font-medium">{room.room_number}</p>
                    <StatusBadge status={room.status} className="mt-0.5" />
                  </div>
                  <div className="relative flex">
                    {dayList.map((d) => (
                      <div
                        key={d}
                        style={{ width: CELL, height: 56 }}
                        onDragOver={(e) => {
                          if (!drag) return;
                          e.preventDefault();
                          setHover(`${room.id}:${d}`);
                        }}
                        onDragLeave={() => setHover((h) => (h === `${room.id}:${d}` ? null : h))}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDrop(room.id, d);
                        }}
                        className={cn(
                          "shrink-0 border-l",
                          shortDay(d).weekend && "bg-muted/30",
                          d === today && "bg-primary/5",
                          hover === `${room.id}:${d}` && "bg-primary/20",
                        )}
                      />
                    ))}

                    {bars.map((r) => {
                      const startIdx = Math.max(0, dayList.indexOf(r.check_in));
                      const rawStart = dayList.indexOf(r.check_in);
                      const endIdx =
                        dayList.indexOf(r.check_out) === -1
                          ? dayList.length
                          : dayList.indexOf(r.check_out);
                      const span = Math.max(1, endIdx - startIdx);
                      if (endIdx <= 0) return null;
                      const draggable = canEdit && r.status !== "checked_out";
                      return (
                        <button
                          key={r.id}
                          type="button"
                          draggable={draggable}
                          onDragStart={() =>
                            setDrag({
                              id: r.id,
                              nights: nightsBetween(r.check_in, r.check_out),
                              offset: rawStart === -1 ? 0 : 0,
                            })
                          }
                          onDragEnd={() => {
                            setDrag(null);
                            setHover(null);
                          }}
                          onClick={() => setSelected(r)}
                          title={`${r.guests?.full_name ?? "Guest"} · ${r.reference}`}
                          style={{
                            left: startIdx * CELL + 3,
                            width: span * CELL - 6,
                            top: 8,
                          }}
                          className={cn(
                            "absolute flex h-10 items-center gap-1 overflow-hidden rounded-md px-2 text-left text-[11px] font-medium shadow-sm transition hover:brightness-110",
                            STATUS_BAR[r.status] ?? "bg-primary text-primary-foreground",
                            draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                          )}
                        >
                          <span className="truncate">
                            {r.guests?.full_name ?? "Guest"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.guests?.full_name ?? "Reservation"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">{selected.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stay</span>
                <span>
                  {formatDate(selected.check_in)} → {formatDate(selected.check_out)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guests</span>
                <span>{selected.num_guests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{formatCurrency(selected.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={selected.status} />
              </div>
            </div>
          )}
          {canEdit && selected && (
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="outline"
                disabled={selected.status !== "checked_in" || setStatus.isPending}
                onClick={() => {
                  setStatus.mutate({ id: selected.id, status: "checked_out" });
                  setSelected(null);
                }}
              >
                <LogOut className="mr-1.5 h-4 w-4" /> Check out
              </Button>
              <Button
                disabled={
                  !["confirmed", "pending"].includes(selected.status) || setStatus.isPending
                }
                onClick={() => {
                  setStatus.mutate({ id: selected.id, status: "checked_in" });
                  setSelected(null);
                }}
              >
                <LogIn className="mr-1.5 h-4 w-4" /> Check in
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

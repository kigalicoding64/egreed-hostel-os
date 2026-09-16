import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ReservationStatus } from "@/lib/hotel-constants";

const RELATED_KEYS = [
  "reservations",
  "reservation-calendar",
  "rooms",
  "dashboard",
  "housekeeping-tasks",
  "hotel-ref",
];

/** Invalidates every view affected by a reservation change. */
export function useReservationInvalidate() {
  const qc = useQueryClient();
  return () => {
    RELATED_KEYS.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
  };
}

function friendlyError(error: unknown): string {
  const message = (error as { message?: string })?.message ?? "Something went wrong";
  if (message.includes("already booked")) {
    return message.replace("Room already booked", "That room is already booked");
  }
  return message;
}

/** Moves a reservation to another room and/or date range. */
export function useMoveReservation() {
  const invalidate = useReservationInvalidate();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      room_id: string;
      check_in: string;
      check_out: string;
    }) => {
      const { error } = await supabase
        .from("reservations")
        .update({
          room_id: input.room_id,
          check_in: input.check_in,
          check_out: input.check_out,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Reservation moved");
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/** Changes reservation status; DB triggers sync room status + housekeeping. */
export function useSetReservationStatus() {
  const invalidate = useReservationInvalidate();
  return useMutation({
    mutationFn: async (input: { id: string; status: ReservationStatus }) => {
      const { error } = await supabase
        .from("reservations")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
      return input.status;
    },
    onSuccess: (status) => {
      invalidate();
      const messages: Record<string, string> = {
        checked_in: "Guest checked in — room marked occupied",
        checked_out: "Guest checked out — cleaning task created",
        confirmed: "Reservation confirmed",
        cancelled: "Reservation cancelled",
        no_show: "Marked as no-show",
      };
      toast.success(messages[status] ?? "Reservation updated");
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

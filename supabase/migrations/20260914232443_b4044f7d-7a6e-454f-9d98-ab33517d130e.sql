-- Recreate guest portal policies without a callable helper function
DROP POLICY IF EXISTS "Guests can view their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Guests can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Guests can view payments for their reservations" ON public.payments;
DROP POLICY IF EXISTS "Guests can view their own restaurant orders" ON public.pos_orders;
DROP POLICY IF EXISTS "Guests can view items on their own orders" ON public.pos_order_items;
DROP POLICY IF EXISTS "Guests can view the room they are staying in" ON public.rooms;
DROP FUNCTION IF EXISTS public.current_guest_ids();

CREATE POLICY "Guests can view their own reservations"
ON public.reservations FOR SELECT TO authenticated
USING (guest_id IN (SELECT id FROM public.guests WHERE user_id = auth.uid()));

CREATE POLICY "Guests can view their own invoices"
ON public.invoices FOR SELECT TO authenticated
USING (guest_id IN (SELECT id FROM public.guests WHERE user_id = auth.uid()));

CREATE POLICY "Guests can view payments for their reservations"
ON public.payments FOR SELECT TO authenticated
USING (
  reservation_id IN (
    SELECT r.id FROM public.reservations r
    JOIN public.guests g ON g.id = r.guest_id
    WHERE g.user_id = auth.uid()
  )
  OR invoice_id IN (
    SELECT i.id FROM public.invoices i
    JOIN public.guests g ON g.id = i.guest_id
    WHERE g.user_id = auth.uid()
  )
);

CREATE POLICY "Guests can view their own restaurant orders"
ON public.pos_orders FOR SELECT TO authenticated
USING (guest_id IN (SELECT id FROM public.guests WHERE user_id = auth.uid()));

CREATE POLICY "Guests can view items on their own orders"
ON public.pos_order_items FOR SELECT TO authenticated
USING (order_id IN (
  SELECT o.id FROM public.pos_orders o
  JOIN public.guests g ON g.id = o.guest_id
  WHERE g.user_id = auth.uid()
));

CREATE POLICY "Guests can view the room they are staying in"
ON public.rooms FOR SELECT TO authenticated
USING (id IN (
  SELECT r.room_id FROM public.reservations r
  JOIN public.guests g ON g.id = r.guest_id
  WHERE g.user_id = auth.uid()
    AND r.status IN ('confirmed','checked_in','pending')
));

-- Trigger functions must not be callable directly
REVOKE EXECUTE ON FUNCTION public.prevent_double_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_room_on_reservation_status() FROM PUBLIC, anon, authenticated;
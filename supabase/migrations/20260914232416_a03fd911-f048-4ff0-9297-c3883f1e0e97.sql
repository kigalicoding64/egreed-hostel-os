-- 1. Link guests to auth accounts
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS guests_user_id_key ON public.guests(user_id) WHERE user_id IS NOT NULL;

-- helper: current guest ids for the signed-in user
CREATE OR REPLACE FUNCTION public.current_guest_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.guests WHERE user_id = auth.uid() $$;

REVOKE EXECUTE ON FUNCTION public.current_guest_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_guest_ids() TO authenticated;

-- 2. Double booking prevention
CREATE OR REPLACE FUNCTION public.prevent_double_booking()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE conflict_ref text;
BEGIN
  IF NEW.room_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status IN ('cancelled','no_show','checked_out') THEN RETURN NEW; END IF;

  SELECT r.reference INTO conflict_ref
  FROM public.reservations r
  WHERE r.room_id = NEW.room_id
    AND r.id <> NEW.id
    AND r.status NOT IN ('cancelled','no_show','checked_out')
    AND NEW.check_in < r.check_out
    AND NEW.check_out > r.check_in
  LIMIT 1;

  IF conflict_ref IS NOT NULL THEN
    RAISE EXCEPTION 'Room already booked for these dates (conflicting reservation %)', conflict_ref
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_prevent_double_booking ON public.reservations;
CREATE TRIGGER trg_prevent_double_booking
BEFORE INSERT OR UPDATE OF room_id, check_in, check_out, status ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.prevent_double_booking();

-- 3. Check-in / check-out side effects on rooms + housekeeping
CREATE OR REPLACE FUNCTION public.sync_room_on_reservation_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.room_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'checked_in' THEN
    UPDATE public.rooms SET status = 'occupied' WHERE id = NEW.room_id;
  ELSIF NEW.status = 'checked_out' THEN
    UPDATE public.rooms SET status = 'dirty', cleaning_status = 'dirty' WHERE id = NEW.room_id;
    INSERT INTO public.housekeeping_tasks (hotel_id, room_id, status, priority, task_type, scheduled_for, notes, created_by)
    VALUES (NEW.hotel_id, NEW.room_id, 'pending', 'high', 'checkout_clean', CURRENT_DATE,
            'Auto-created on check-out of reservation ' || NEW.reference, auth.uid());
  ELSIF NEW.status IN ('confirmed','pending') AND OLD.status = 'checked_out' THEN
    UPDATE public.rooms SET status = 'reserved' WHERE id = NEW.room_id;
  ELSIF NEW.status IN ('cancelled','no_show') THEN
    UPDATE public.rooms SET status = 'available'
    WHERE id = NEW.room_id AND status IN ('reserved');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_room_on_reservation_status ON public.reservations;
CREATE TRIGGER trg_sync_room_on_reservation_status
AFTER UPDATE OF status ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.sync_room_on_reservation_status();

-- 4. Guest portal read policies
CREATE POLICY "Guests can view their own guest record"
ON public.guests FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Guests can view their own reservations"
ON public.reservations FOR SELECT TO authenticated
USING (guest_id IN (SELECT public.current_guest_ids()));

CREATE POLICY "Guests can view their own invoices"
ON public.invoices FOR SELECT TO authenticated
USING (guest_id IN (SELECT public.current_guest_ids()));

CREATE POLICY "Guests can view payments for their reservations"
ON public.payments FOR SELECT TO authenticated
USING (reservation_id IN (
  SELECT id FROM public.reservations WHERE guest_id IN (SELECT public.current_guest_ids())
) OR invoice_id IN (
  SELECT id FROM public.invoices WHERE guest_id IN (SELECT public.current_guest_ids())
));

CREATE POLICY "Guests can view their own restaurant orders"
ON public.pos_orders FOR SELECT TO authenticated
USING (guest_id IN (SELECT public.current_guest_ids()));

CREATE POLICY "Guests can view items on their own orders"
ON public.pos_order_items FOR SELECT TO authenticated
USING (order_id IN (
  SELECT id FROM public.pos_orders WHERE guest_id IN (SELECT public.current_guest_ids())
));

CREATE POLICY "Guests can view the room they are staying in"
ON public.rooms FOR SELECT TO authenticated
USING (id IN (
  SELECT room_id FROM public.reservations
  WHERE guest_id IN (SELECT public.current_guest_ids())
    AND status IN ('confirmed','checked_in','pending')
));
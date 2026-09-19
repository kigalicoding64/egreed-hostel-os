CREATE TYPE public.room_key_status AS ENUM ('active','returned','lost','deactivated');

CREATE TABLE public.room_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  key_code text NOT NULL,
  key_type text NOT NULL DEFAULT 'card',
  status public.room_key_status NOT NULL DEFAULT 'active',
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid REFERENCES auth.users(id),
  returned_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_keys TO authenticated;
GRANT ALL ON public.room_keys TO service_role;

ALTER TABLE public.room_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Front desk staff manage room keys"
ON public.room_keys FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','receptionist','security_officer','housekeeping_manager']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','receptionist','security_officer']::app_role[]));

CREATE POLICY "Guests view keys on their own booking"
ON public.room_keys FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.guests g WHERE g.id = room_keys.guest_id AND g.user_id = auth.uid()));

CREATE INDEX idx_room_keys_reservation ON public.room_keys(reservation_id);
CREATE INDEX idx_room_keys_status ON public.room_keys(hotel_id, status);

CREATE TRIGGER room_keys_upd BEFORE UPDATE ON public.room_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
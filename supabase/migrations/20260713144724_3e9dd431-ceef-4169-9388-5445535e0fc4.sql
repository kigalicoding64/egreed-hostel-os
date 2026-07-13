-- ========== ENUM EXTENSIONS ==========
ALTER TYPE public.room_status ADD VALUE IF NOT EXISTS 'inspected';
ALTER TYPE public.room_status ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE public.room_status ADD VALUE IF NOT EXISTS 'out_of_service';
ALTER TYPE public.room_status ADD VALUE IF NOT EXISTS 'blocked';

ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'waitlist';

-- New enum for reservation source / channel
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='reservation_source') THEN
    CREATE TYPE public.reservation_source AS ENUM
      ('walk_in','phone','email','website','corporate','group','travel_agent','ota');
  END IF;
END$$;

-- Add mobile-money sub methods (MTN / Airtel) — kept generic via existing 'mobile_money'
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'mtn_momo';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'airtel_money';

-- ========== ROOMS: rich attributes ==========
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS room_name text,
  ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS num_beds integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bed_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_guests integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS room_size numeric,
  ADD COLUMN IF NOT EXISTS base_price numeric,
  ADD COLUMN IF NOT EXISTS weekend_price numeric,
  ADD COLUMN IF NOT EXISTS seasonal_price numeric,
  ADD COLUMN IF NOT EXISTS cleaning_status text NOT NULL DEFAULT 'clean',
  ADD COLUMN IF NOT EXISTS maintenance_status text NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS qr_code text,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- ========== RESERVATIONS: enterprise fields ==========
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS source public.reservation_source NOT NULL DEFAULT 'walk_in',
  ADD COLUMN IF NOT EXISTS adults integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rate_plan_id uuid,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS special_requests text,
  ADD COLUMN IF NOT EXISTS confirmation_number text;

-- ========== GUESTS: CRM fields ==========
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS passport text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS vehicle_info text,
  ADD COLUMN IF NOT EXISTS vip_status boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferences text;

-- ========== RATE PLANS ==========
CREATE TABLE IF NOT EXISTS public.rate_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  adjustment_type text NOT NULL DEFAULT 'percent',
  adjustment_value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_plans TO authenticated;
GRANT ALL ON public.rate_plans TO service_role;

ALTER TABLE public.rate_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view rate plans"
  ON public.rate_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Management can manage rate plans"
  ON public.rate_plans FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_rate_plans_updated_at
  BEFORE UPDATE ON public.rate_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
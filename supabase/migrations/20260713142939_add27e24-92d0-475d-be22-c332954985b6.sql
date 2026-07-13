
-- ========== ENUMS ==========
CREATE TYPE public.app_role AS ENUM (
  'super_admin','hotel_owner','general_manager','receptionist','accountant',
  'housekeeping_manager','housekeeping_staff','restaurant_manager','cashier',
  'kitchen_staff','maintenance_manager','maintenance_staff','security_officer',
  'marketing_manager','customer_support','guest_portal'
);
CREATE TYPE public.room_status AS ENUM ('available','occupied','reserved','dirty','out_of_order','cleaning');
CREATE TYPE public.reservation_status AS ENUM ('pending','confirmed','checked_in','checked_out','cancelled','no_show');
CREATE TYPE public.payment_status AS ENUM ('pending','partial','paid','refunded','failed');
CREATE TYPE public.payment_method AS ENUM ('cash','card','mobile_money','bank_transfer','other');

-- ========== TIMESTAMP HELPER ==========
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  job_title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========== USER ROLES ==========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ========== SECURITY DEFINER HELPERS ==========
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles));
$$;

-- management shortcut
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','hotel_owner','general_manager'));
$$;

-- ========== NEW USER TRIGGER ==========
-- First user becomes super_admin; everyone else gets customer_support baseline.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email);

  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer_support');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== PROFILES / ROLES POLICIES ==========
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

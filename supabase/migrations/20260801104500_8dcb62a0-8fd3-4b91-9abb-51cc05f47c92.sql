-- Harden security definer role helpers: only answer for the calling user
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
      AND role IN ('super_admin','hotel_owner','general_manager'))
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- employees
DROP POLICY IF EXISTS read_employees ON public.employees;
CREATE POLICY read_employees ON public.employees FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR profile_id = auth.uid());

-- guests
DROP POLICY IF EXISTS read_guests ON public.guests;
CREATE POLICY read_guests ON public.guests FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','receptionist','customer_support','marketing_manager']::app_role[]));

-- invoices
DROP POLICY IF EXISTS read_invoices ON public.invoices;
CREATE POLICY read_invoices ON public.invoices FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','accountant','receptionist','cashier']::app_role[]));

-- payments
DROP POLICY IF EXISTS read_payments ON public.payments;
CREATE POLICY read_payments ON public.payments FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','accountant','receptionist','cashier']::app_role[]));

-- profiles
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin(auth.uid()));

-- reservations
DROP POLICY IF EXISTS read_reservations ON public.reservations;
CREATE POLICY read_reservations ON public.reservations FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin','hotel_owner','general_manager','receptionist','customer_support','accountant','cashier','housekeeping_manager']::app_role[]));

-- settings
DROP POLICY IF EXISTS read_settings ON public.settings;
CREATE POLICY read_settings ON public.settings FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- user_roles
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
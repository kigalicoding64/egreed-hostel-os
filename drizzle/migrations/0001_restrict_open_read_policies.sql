CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
  ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role <> 'guest_portal') END;
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

DROP POLICY IF EXISTS "tc_read" ON public.task_comments;
CREATE POLICY "tc_read" ON public.task_comments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "laundry_items_read" ON public.laundry_items;
CREATE POLICY "laundry_items_read" ON public.laundry_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "laundry_orders_read" ON public.laundry_orders;
CREATE POLICY "laundry_orders_read" ON public.laundry_orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "read_buildings" ON public.buildings;
CREATE POLICY "read_buildings" ON public.buildings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "read_floors" ON public.floors;
CREATE POLICY "read_floors" ON public.floors FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "lf_read" ON public.lost_found;
CREATE POLICY "lf_read" ON public.lost_found FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "assets_read" ON public.assets;
CREATE POLICY "assets_read" ON public.assets FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "insp_read" ON public.room_inspections;
CREATE POLICY "insp_read" ON public.room_inspections FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "read_departments" ON public.departments;
CREATE POLICY "read_departments" ON public.departments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "pm_read" ON public.pm_schedules;
CREATE POLICY "pm_read" ON public.pm_schedules FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "read_room_amenities" ON public.room_amenities;
CREATE POLICY "read_room_amenities" ON public.room_amenities FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'guest_portal'));
DROP POLICY IF EXISTS "read_hotels" ON public.hotels;
CREATE POLICY "read_hotels" ON public.hotels FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'guest_portal'));
DROP POLICY IF EXISTS "read_room_types" ON public.room_types;
CREATE POLICY "read_room_types" ON public.room_types FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'guest_portal'));
DROP POLICY IF EXISTS "Authenticated can view rate plans" ON public.rate_plans;
CREATE POLICY "Authenticated can view rate plans" ON public.rate_plans FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'guest_portal'));
DROP POLICY IF EXISTS "read_rooms" ON public.rooms;
CREATE POLICY "read_rooms" ON public.rooms FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.reservations r JOIN public.guests g ON g.id = r.guest_id
    WHERE r.room_id = rooms.id AND g.user_id = auth.uid()));
DROP POLICY IF EXISTS "read_amenities" ON public.amenities;
CREATE POLICY "read_amenities" ON public.amenities FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'guest_portal'));
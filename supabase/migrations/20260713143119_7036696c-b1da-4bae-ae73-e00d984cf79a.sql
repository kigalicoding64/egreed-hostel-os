
DROP POLICY IF EXISTS "rooms_ops_update" ON public.rooms;
CREATE POLICY "rooms_ops_update" ON public.rooms FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['receptionist','housekeeping_manager','housekeeping_staff']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['receptionist','housekeeping_manager','housekeeping_staff']::public.app_role[]));

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;

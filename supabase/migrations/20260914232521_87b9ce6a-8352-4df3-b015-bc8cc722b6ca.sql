DROP POLICY IF EXISTS "Guests can view their own guest record" ON public.guests;

CREATE POLICY "Guests can view their own or matching guest record"
ON public.guests FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND email IS NOT NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
);

CREATE POLICY "Users can claim a guest record matching their email"
ON public.guests FOR UPDATE TO authenticated
USING (user_id IS NULL AND email IS NOT NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Guests can request their own bookings"
ON public.reservations FOR INSERT TO authenticated
WITH CHECK (
  guest_id IN (SELECT id FROM public.guests WHERE user_id = auth.uid())
  AND status = 'pending'
  AND source = 'website'
);
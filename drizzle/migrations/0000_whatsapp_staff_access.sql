CREATE TABLE public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  user_id uuid,
  email text,
  expires_at timestamptz,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.whatsapp_sessions TO authenticated;
GRANT ALL ON public.whatsapp_sessions TO service_role;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY wa_sessions_admin_read ON public.whatsapp_sessions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY wa_sessions_admin_delete ON public.whatsapp_sessions FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());

CREATE TABLE public.whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id text NOT NULL UNIQUE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text,
  attempts int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.whatsapp_webhook_events TO authenticated;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY wa_events_admin_read ON public.whatsapp_webhook_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE INDEX wa_events_pending_idx ON public.whatsapp_webhook_events (received_at) WHERE processed_at IS NULL;

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('in','out')),
  phone text NOT NULL,
  user_id uuid,
  body text NOT NULL DEFAULT '',
  wa_message_id text UNIQUE,
  reply_to text UNIQUE,
  status text NOT NULL DEFAULT 'received',
  status_at timestamptz,
  error text,
  channel text NOT NULL DEFAULT 'whatsapp',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY wa_messages_read ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE INDEX wa_messages_phone_idx ON public.whatsapp_messages (phone, created_at DESC);